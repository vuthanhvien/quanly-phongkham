export function formatNumberInput(value: string | number | undefined) {
  if (value === undefined || value === null || value === "") return ""
  const raw = String(value).replace(/,/g, "")
  const [integer, decimal] = raw.split(".")
  const sign = integer.startsWith("-") ? "-" : ""
  const digits = integer.replace(/^-/, "")
  const formattedInteger = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${sign}${formattedInteger}${decimal === undefined ? "" : `.${decimal}`}`
}

export function parseNumberInput(value: string | undefined) {
  return (value || "").replace(/,/g, "")
}
