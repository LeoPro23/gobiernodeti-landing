/** Resultado de las acciones de los formularios del panel. */
export type AdminFormState = { ok: true; message: string; nonce: number } | { ok: false; error: string; details?: string[] } | null

export type AdminFormAction = (state: AdminFormState, form: FormData) => Promise<AdminFormState>
