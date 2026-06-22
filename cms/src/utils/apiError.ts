export function getApiErrorMessage(error: unknown, fallback: string) {
  const message = extractErrorMessage(error)
  return message || fallback
}

function extractErrorMessage(error: unknown): string | undefined {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data
  return normalizeMessage(
    (responseData as { message?: unknown })?.message ??
      (responseData as { error?: unknown })?.error ??
      (error as { message?: unknown })?.message,
  )
}

function normalizeMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const parts = value.map((item) => normalizeMessage(item)).filter(Boolean)
    return parts.length > 0 ? parts.join("\n") : undefined
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const detail = normalizeMessage(item)
        return detail ? `${key}: ${detail}` : key
      })
      .filter(Boolean)
    return entries.length > 0 ? entries.join("\n") : undefined
  }
  return undefined
}
