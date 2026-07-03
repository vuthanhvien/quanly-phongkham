import dayjs from "dayjs"
import { parseClinicDateTime } from "../../utils/datetime"

export const EMPTY_LIST = { data: [], total: 0 }

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value)
}

export function parseAmount(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function isSameDay(value: unknown, selectedDate = dayjs()) {
  if (!value) return false
  const parsed = parseClinicDateTime(value)
  return parsed.isValid() && parsed.isSame(selectedDate, "day")
}

export function formatEventTime(value: string, end?: string) {
  const start = parseClinicDateTime(value)
  const finish = end ? parseClinicDateTime(end) : null
  const startTime = start.isValid() ? start.format("HH:mm") : "--:--"
  if (!finish?.isValid()) return startTime
  return `${startTime} - ${finish.format("HH:mm")}`
}
