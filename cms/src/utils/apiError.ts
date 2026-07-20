export function getApiErrorMessage(error: unknown, fallback: string) {
  const message = extractErrorMessage(error)
  return localizeApiMessage(message || fallback)
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

function localizeApiMessage(message: string) {
  const exactMap: Record<string, string> = {
    "Bac si hoac phong da co lich trong khung gio nay": "Bác sĩ hoặc phòng đã có lịch trong khung giờ này",
    "Co loi xay ra": "Có lỗi xảy ra",
    "Loi khong xac dinh": "Lỗi không xác định",
    "Can nhap ten page": "Cần nhập tên page",
  }

  if (exactMap[message]) return exactMap[message]

  return message
    .replace(/\bBac si\b/g, "Bác sĩ")
    .replace(/\bphong\b/g, "phòng")
    .replace(/\blich\b/g, "lịch")
    .replace(/\bkhung gio nay\b/g, "khung giờ này")
    .replace(/\bkhung gio\b/g, "khung giờ")
    .replace(/\bda co\b/g, "đã có")
    .replace(/\bda\b/g, "đã")
    .replace(/\bco\b/g, "có")
    .replace(/\bkhong\b/g, "không")
    .replace(/\bKhong\b/g, "Không")
    .replace(/\bLoi\b/g, "Lỗi")
    .replace(/\bloi\b/g, "lỗi")
    .replace(/\bCan\b/g, "Cần")
    .replace(/\bcan\b/g, "cần")
    .replace(/\bnhap\b/g, "nhập")
    .replace(/\bten\b/g, "tên")
}
