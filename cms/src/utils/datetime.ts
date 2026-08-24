import dayjs, { type Dayjs } from "dayjs"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)
dayjs.extend(timezone)

export const CLINIC_TIME_ZONE = "Asia/Ho_Chi_Minh"

function normalizeIsoLikeText(value: string) {
  return value.trim().replace(" ", "T")
}

function hasExplicitTimeZone(value: string) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
}

export function normalizeDateValueForInput(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined
  const text = String(value).trim()
  if (!text) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = parseClinicDateTime(text)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : undefined
}

export function normalizeDateTimeValueForInput(value: unknown) {
  const parsed = parseClinicDateTime(value)
  return parsed.isValid() ? parsed.format("YYYY-MM-DDTHH:mm") : undefined
}

export function parseClinicDateTime(value: unknown): Dayjs {
  if (value === null || value === undefined || value === "") return dayjs("")
  if (dayjs.isDayjs(value)) return value.tz(CLINIC_TIME_ZONE)
  if (typeof value === "string") {
    const normalized = normalizeIsoLikeText(value)
    return hasExplicitTimeZone(normalized)
      ? dayjs(normalized).tz(CLINIC_TIME_ZONE)
      : dayjs.tz(normalized, CLINIC_TIME_ZONE)
  }
  return dayjs(value as Date | number).tz(CLINIC_TIME_ZONE)
}

/** Serialize all API datetimes with an explicit clinic offset. */
export function formatClinicDateTimeForApi(value: unknown) {
  const parsed = parseClinicDateTime(value)
  return parsed.isValid() ? parsed.format("YYYY-MM-DDTHH:mm:ssZ") : undefined
}

export function formatClinicDateTime(value: unknown, format = "DD/MM/YYYY HH:mm") {
  const parsed = parseClinicDateTime(value)
  return parsed.isValid() ? parsed.format(format) : "-"
}

export function currentLocalDate() {
  return dayjs().tz(CLINIC_TIME_ZONE).format("YYYY-MM-DD")
}

export function currentLocalDateTime() {
  return dayjs().tz(CLINIC_TIME_ZONE).format("YYYY-MM-DDTHH:mm")
}

export function clinicNow() {
  return dayjs().tz(CLINIC_TIME_ZONE)
}

export function buildLocalDateTime(date: Dayjs, hour = 0, minute = 0) {
  return date.tz(CLINIC_TIME_ZONE).hour(hour).minute(minute).second(0).millisecond(0).format("YYYY-MM-DDTHH:mm")
}
