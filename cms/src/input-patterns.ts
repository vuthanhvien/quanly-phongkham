import IMask from "imask"

export const INPUT_PATTERN_OPTIONS = [
  { value: "time-hh-mm", label: "Giờ (HH:MM)" },
]

export function getInputPatternConfig(pattern?: string) {
  if (pattern !== "time-hh-mm") return undefined

  return {
    mask: "HH:MM",
    blocks: {
      HH: { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 },
      MM: { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 },
    },
  }
}

export function getInputPatternLabel(pattern?: string) {
  return INPUT_PATTERN_OPTIONS.find((item) => item.value === pattern)?.label
}

export function isInputPatternComplete(pattern: string | undefined, value: unknown) {
  if (value === undefined || value === null || value === "") return true
  if (pattern === "time-hh-mm") {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value))
    if (!match) return false
    return Number(match[1]) <= 23 && Number(match[2]) <= 59
  }
  return true
}
