/** Only finite technical categories cross the logger bridge; never serialize an error. */
const ERROR_TYPES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "AbortError",
])
const ERROR_CODES = new Set([
  "ERR_UNEXPECTED",
  "ERR_FUNCTION_CALL",
  "ERR_INVALID_ARGUMENT",
  "ERR_INTERNAL",
  "ERR_MODULE_NOT_FOUND",
  "ERR_NO_PERMISSION",
  "ERR_MISSING_PERMISSIONS",
  "github",
  "invalidData",
  "remoteChanged",
])
const HTTP_STATUSES = new Set([
  400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504,
])

export function diagnosticMetadata(error: unknown): string | null {
  if (error == null) return null
  if (typeof error !== "object") return JSON.stringify({ errorType: "NonError" })
  // Read only these scalar properties. Do not traverse causes, stacks or custom toJSON.
  const value = error as { name?: unknown; code?: unknown; statusCode?: unknown }
  const name = value.name
  const code = value.code
  const status = value.statusCode
  return JSON.stringify({
    errorType: typeof name === "string" && ERROR_TYPES.has(name) ? name : "UnknownError",
    ...(typeof code === "string" && ERROR_CODES.has(code) ? { errorCode: code } : {}),
    ...(typeof status === "number" && HTTP_STATUSES.has(status)
      ? { httpStatus: status }
      : {}),
  })
}
