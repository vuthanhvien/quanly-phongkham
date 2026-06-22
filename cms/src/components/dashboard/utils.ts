import dayjs from "dayjs"

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
  const parsed = dayjs(
    typeof value === "string" || typeof value === "number" || value instanceof Date
      ? value
      : String(value),
  )
  return parsed.isValid() && parsed.isSame(selectedDate, "day")
}

export function formatEventTime(value: string, end?: string) {
  const startTime = dayjs(value).isValid() ? dayjs(value).format("HH:mm") : "--:--"
  if (!end || !dayjs(end).isValid()) return startTime
  return `${startTime} - ${dayjs(end).format("HH:mm")}`
}
