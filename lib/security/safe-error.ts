import "server-only"

type ErrorMetadata = {
  code?: unknown
  name?: unknown
  status?: unknown
  detail?: unknown
  parameter?: unknown
  operation?: unknown
}

/**
 * Registra apenas metadados operacionais não sensíveis. Mensagens de banco,
 * SQL, payloads e dados pessoais nunca devem chegar aos logs da aplicação.
 */
export function logSafeServerError(context: string, error: unknown) {
  const metadata = (error ?? {}) as ErrorMetadata
  const safeMetadata: Record<string, string | number> = {}

  if (typeof metadata.code === "string" && metadata.code.length <= 40) {
    safeMetadata.code = metadata.code
  }
  if (typeof metadata.name === "string" && metadata.name.length <= 80) {
    safeMetadata.name = metadata.name
  }
  if (typeof metadata.status === "number" && Number.isInteger(metadata.status)) {
    safeMetadata.status = metadata.status
  }

  if (typeof metadata.detail === "string" && /^[A-Za-z0-9_.-]{1,60}$/.test(metadata.detail)) {
    safeMetadata.detail = metadata.detail
  }
  if (typeof metadata.parameter === "string" && ["start_date", "end_date", "max_results", "page_token", "buyer_email", "product_id", "transaction", "date_range"].includes(metadata.parameter)) {
    safeMetadata.parameter = metadata.parameter
  }
  if (typeof metadata.operation === "string" && ["product_catalog", "confirm_transaction", "find_sales"].includes(metadata.operation)) {
    safeMetadata.operation = metadata.operation
  }

  console.error(`[security] ${context}`, safeMetadata)
}

export function throwSafeDatabaseError(
  context: string,
  error: unknown,
  publicMessage: string,
): never {
  logSafeServerError(context, error)
  throw new Error(publicMessage)
}
