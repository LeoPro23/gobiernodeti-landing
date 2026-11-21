import "server-only";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

let localPool: Pool | undefined;

// Docker injects secrets at runtime, not while collecting page modules.
export function getPool() {
  if (localPool) return localPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta configurar DATABASE_URL en el servidor.");
  localPool = globalThis.__dbPool ?? new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    max: 10,
  });
  if (process.env.NODE_ENV !== "production") globalThis.__dbPool = localPool;
  return localPool;
}

let tableEnsured: Promise<void> | null = null;

/** Crea o migra las tablas una sola vez por proceso, aunque lleguen varias solicitudes a la vez. */
export function ensureRegistrationTable() {
  tableEnsured ??= createRegistrationTables().catch((error) => {
    tableEnsured = null;
    throw error;
  });
  return tableEnsured;
}

async function createRegistrationTables() {
  const query = `
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      nombres VARCHAR(150) NOT NULL,
      apellidos VARCHAR(150) NOT NULL,
      dni VARCHAR(20) NOT NULL UNIQUE,
      universidad VARCHAR(200) NOT NULL,
      carrera VARCHAR(200) NOT NULL,
      ciclo VARCHAR(50) NOT NULL,
      telefono VARCHAR(30),
      ciudad VARCHAR(100),
      acepta_terminos BOOLEAN DEFAULT TRUE,
      autoriza_datos BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_registrations_dni ON registrations(dni);

    CREATE TABLE IF NOT EXISTS registration_payment_images (
      id BIGSERIAL PRIMARY KEY,
      registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      bucket VARCHAR(255) NOT NULL,
      object_key VARCHAR(512) NOT NULL UNIQUE,
      operation_number VARCHAR(100),
      content_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
      file_size INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      CONSTRAINT payment_images_webp_type CHECK (content_type = 'image/webp'),
      CONSTRAINT payment_images_positive_size CHECK (file_size > 0),
      CONSTRAINT payment_images_key_prefix CHECK (object_key LIKE 'payment-proofs/%.webp'),
      CONSTRAINT payment_images_status CHECK (status IN ('pending', 'valid', 'invalid')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE registration_payment_images
      ADD COLUMN IF NOT EXISTS operation_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
    CREATE INDEX IF NOT EXISTS idx_payment_images_registration_id
      ON registration_payment_images(registration_id);
    CREATE INDEX IF NOT EXISTS idx_payment_images_operation_number
      ON registration_payment_images(operation_number);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_valid_certificate_payment
      ON registration_payment_images(registration_id)
      WHERE status = 'valid';

    -- Asistencia marcada en el panel y origen de la inscripción (formulario web o panel).
    ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS asistio BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS asistio_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'web';
  `;
  await getPool().query(query);
}

export interface RegistrationInput {
  nombres: string;
  apellidos: string;
  dni: string;
  universidad: string;
  carrera: string;
  ciclo: string;
  telefono?: string;
  ciudad?: string;
  aceptaTerminos: boolean;
  autorizaDatos: boolean;
}

export async function createRegistration(data: RegistrationInput, options: { origen?: "web" | "panel"; asistio?: boolean } = {}) {
  await ensureRegistrationTable();

  // Verificar si ya existe con ese DNI
  const existing = await getPool().query(
    "SELECT id, dni FROM registrations WHERE dni = $1 LIMIT 1",
    [data.dni.trim()],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error("Ya existe un registro con este DNI.");
  }

  const insertQuery = `
    INSERT INTO registrations (
      nombres, apellidos, dni, universidad, carrera, ciclo, telefono, ciudad, acepta_terminos, autoriza_datos,
      origen, asistio, asistio_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $12 THEN NOW() END
    ) RETURNING id, nombres, apellidos, dni, created_at;
  `;
  const values = [
    data.nombres.trim(),
    data.apellidos.trim(),
    data.dni.trim(),
    data.universidad.trim(),
    data.carrera.trim(),
    data.ciclo.trim(),
    data.telefono?.trim() || null,
    data.ciudad?.trim() || null,
    data.aceptaTerminos,
    data.autorizaDatos,
    options.origen ?? "web",
    Boolean(options.asistio),
  ];

  const result = await getPool().query(insertQuery, values);
  return result.rows[0];
}

export interface PaymentImageInput {
  registrationId: number;
  bucket: string;
  objectKey: string;
  operationNumber: string;
  contentType: "image/webp";
  fileSize: number;
  status?: CertificatePaymentStatus;
}

export type CertificatePaymentStatus = "pending" | "valid" | "invalid";

export async function createPaymentImageRecord(data: PaymentImageInput) {
  await ensureRegistrationTable();

  const operationNumber = data.operationNumber.trim();
  if (!operationNumber || operationNumber.length > 100) {
    throw new Error("El número de operación no es válido.");
  }

  const status = data.status ?? "pending";
  if (
    !(["pending", "valid", "invalid"] as CertificatePaymentStatus[]).includes(
      status,
    )
  ) {
    throw new Error("El estado del comprobante no es válido.");
  }

  const result = await getPool().query(
    `
      INSERT INTO registration_payment_images (
        registration_id, bucket, object_key, operation_number, content_type, file_size, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, registration_id, bucket, object_key, operation_number,
        content_type, file_size, status, created_at;
    `,
    [
      data.registrationId,
      data.bucket,
      data.objectKey,
      operationNumber,
      data.contentType,
      data.fileSize,
      status,
    ],
  );

  return result.rows[0];
}

export async function findRegistrationByDni(dni: string) {
  await ensureRegistrationTable();

  const result = await getPool().query(
    `
      SELECT id, nombres, apellidos, dni
      FROM registrations
      WHERE dni = $1
      LIMIT 1;
    `,
    [dni.trim()],
  );

  return result.rows[0] ?? null;
}

export async function findCurrentCertificatePayment(registrationId: number) {
  await ensureRegistrationTable();

  const result = await getPool().query<{ status: CertificatePaymentStatus }>(
    `
      SELECT status
      FROM registration_payment_images
      WHERE registration_id = $1
      ORDER BY CASE status WHEN 'valid' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
        created_at DESC NULLS LAST, id DESC
      LIMIT 1;
    `,
    [registrationId],
  );

  return result.rows[0] ?? null;
}
