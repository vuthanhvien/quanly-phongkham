import IMask from "imask"

export function getInputPatternConfig(pattern?: string) {
  const normalized = String(pattern || "").trim()
  if (!normalized) return undefined

  if (normalized === "time-hh-mm" || /^HH[:-]MM$/.test(normalized)) {
    const separator = normalized === "time-hh-mm" ? ":" : normalized.charAt(2)
    return {
      mask: `HH${separator}MM`,
      blocks: {
        HH: { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 },
        MM: { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 },
      },
    }
  }

  if (!/[9A]/.test(normalized)) return undefined
  return { mask: normalized.replace(/9/g, "0").replace(/A/g, "a"), blocks: {} }
}

export function getInputPatternLabel(pattern?: string) {
  return String(pattern || "").trim()
}

export function isInputPatternComplete(pattern: string | undefined, value: unknown) {
  if (value === undefined || value === null || value === "") return true
  const normalized = String(pattern || "").trim()
  if (normalized === "time-hh-mm" || /^HH[:-]MM$/.test(normalized)) {
    const separator = normalized === "time-hh-mm" ? ":" : normalized.charAt(2)
    const match = new RegExp(`^(\\d{2})${separator === ":" ? "\\:" : "-"}(\\d{2})$`).exec(String(value))
    if (!match) return false
    return Number(match[1]) <= 23 && Number(match[2]) <= 59
  }
  if (!/[9A]/.test(normalized)) return true
  const expression = Array.from(normalized).map((character) => {
    if (character === "9") return "\\d"
    if (character === "A") return "[A-Za-z]"
    return character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }).join("")
  return new RegExp(`^${expression}$`).test(String(value))
}
