export function getInputPatternConfig(pattern?: string) {
  const normalized = String(pattern || "").trim()
  if (!normalized) return undefined

  if (normalized === "time-hh-mm" || /^HH[:-]MM$/.test(normalized)) {
    return { mask: `99${normalized === "time-hh-mm" ? ":" : normalized.charAt(2)}99` }
  }

  // react-input-mask: 9 = digit, a = letter, * = alphanumeric.
  // The former uppercase A is normalized for backward compatibility.
  const mask = normalized.replace(/A/g, "a")
  if (!/[9a*]/.test(mask)) return undefined
  return { mask }
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
  const expression = Array.from(normalized.replace(/A/g, "a")).map((character) => {
    if (character === "9") return "\\d"
    if (character === "a") return "\\p{L}"
    if (character === "*") return "[\\p{L}\\d]"
    return character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }).join("")
  return new RegExp(`^${expression}$`, "u").test(String(value))
}
