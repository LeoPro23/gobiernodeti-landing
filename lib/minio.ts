import "server-only";

import { randomUUID } from "node:crypto";
import { Client } from "minio";

const DEFAULT_MAX_WEBP_SIZE = 10 * 1024 * 1024;

export interface WebpUpload {
  file: File;
  objectKey?: string;
  maxSizeBytes?: number;
}

export interface UploadedWebp {
  bucket: string;
  objectKey: string;
  contentType: "image/webp";
  size: number;
}

interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

function getMinioConfig(): MinioConfig {
  const endPoint = process.env.MINIO_ENDPOINT?.trim();
  const portValue = process.env.MINIO_PORT?.trim();
  const useSSLValue = process.env.MINIO_USE_SSL?.trim().toLowerCase();
  const bucket = process.env.MINIO_BUCKET?.trim();
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();

  const port = Number(portValue);
  const useSSL = useSSLValue === "true";

  if (
    !endPoint ||
    !portValue ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (useSSLValue !== "true" && useSSLValue !== "false") ||
    !bucket ||
    !accessKey ||
    !secretKey
  ) {
    throw new Error("La configuración de MinIO está incompleta o es inválida.");
  }

  return { endPoint, port, useSSL, bucket, accessKey, secretKey };
}

let minioClient: Client | undefined;

export function getMinioClient(): Client {
  if (minioClient) return minioClient;

  const config = getMinioConfig();
  minioClient = new Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  return minioClient;
}

function isWebpFile(file: File, bytes: Buffer): boolean {
  const fileName = file.name.trim().toLowerCase();
  const riff = bytes.toString("ascii", 0, 4) === "RIFF";
  const webp = bytes.toString("ascii", 8, 12) === "WEBP";

  return (
    fileName.endsWith(".webp") && file.type === "image/webp" && riff && webp
  );
}

function createObjectKey(objectKey?: string): string {
  if (objectKey && /^payment-proofs\/[a-zA-Z0-9._-]+\.webp$/.test(objectKey)) {
    return objectKey;
  }

  return `payment-proofs/${randomUUID()}.webp`;
}

export async function uploadWebp({
  file,
  objectKey,
  maxSizeBytes = DEFAULT_MAX_WEBP_SIZE,
}: WebpUpload): Promise<UploadedWebp> {
  if (!(file instanceof File)) {
    throw new Error("El archivo recibido no es válido.");
  }

  if (!Number.isInteger(maxSizeBytes) || maxSizeBytes <= 0) {
    throw new Error("El límite de tamaño del archivo no es válido.");
  }

  if (file.size <= 0 || file.size > maxSizeBytes) {
    throw new Error(
      `El comprobante debe pesar entre 1 byte y ${maxSizeBytes} bytes.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isWebpFile(file, buffer)) {
    throw new Error("El comprobante debe ser un archivo WebP válido.");
  }

  const config = getMinioConfig();
  const key = createObjectKey(objectKey);
  const client = getMinioClient();

  await client.putObject(config.bucket, key, buffer, buffer.length, {
    "Content-Type": "image/webp",
  });

  return {
    bucket: config.bucket,
    objectKey: key,
    contentType: "image/webp",
    size: buffer.length,
  };
}

export async function deleteObject(objectKey: string): Promise<void> {
  if (!/^payment-proofs\/[a-zA-Z0-9._-]+\.webp$/.test(objectKey)) {
    throw new Error("La key del objeto no es válida.");
  }

  const config = getMinioConfig();
  await getMinioClient().removeObject(config.bucket, objectKey);
}

export async function readPaymentVoucher(bucket: string, objectKey: string) {
  if (!/^payment-proofs\/[a-zA-Z0-9._-]+\.webp$/.test(objectKey)) {
    throw new Error("La key del comprobante no es válida.");
  }

  return getMinioClient().getObject(bucket, objectKey);
}
