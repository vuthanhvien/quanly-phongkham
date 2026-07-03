import dayjs, { type Dayjs } from "dayjs"

function normalizeIsoLikeText(value: string) {
  return value.trim().replace(" ", "T")
}

export function normalizeDateValueForInput(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined
  const text = String(value).trim()
  if (!text) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const normalized = normalizeIsoLikeText(text)
  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (matched?.[1]) return matched[1]
  const parsed = dayjs(text)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : undefined
}

export function normalizeDateTimeValueForInput(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined
  const text = String(value).trim()
  if (!text) return undefined
  const normalized = normalizeIsoLikeText(text)
  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  if (matched?.[1]) return matched[1]
  const parsed = dayjs(text)
  return parsed.isValid() ? parsed.format("YYYY-MM-DDTHH:mm") : undefined
}

export function parseClinicDateTime(value: unknown): Dayjs {
  const normalized = normalizeDateTimeValueForInput(value)
  if (normalized) return dayjs(normalized)
  return dayjs(
    typeof value === "string" || typeof value === "number" || value instanceof Date
      ? value
      : String(value || ""),
  )
}

export function formatClinicDateTime(value: unknown, format = "DD/MM/YYYY HH:mm") {
  const parsed = parseClinicDateTime(value)
  return parsed.isValid() ? parsed.format(format) : "-"
}

export function currentLocalDate() {
  return dayjs().format("YYYY-MM-DD")
}

export function currentLocalDateTime() {
  return dayjs().format("YYYY-MM-DDTHH:mm")
}

export function buildLocalDateTime(date: Dayjs, hour = 0, minute = 0) {
  return date.hour(hour).minute(minute).second(0).millisecond(0).format("YYYY-MM-DDTHH:mm")
}

