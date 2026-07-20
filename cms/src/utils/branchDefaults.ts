export interface SelectOptionLike {
  value?: string
  id?: string
}

export function getFirstOptionValue<T extends SelectOptionLike>(options: T[]) {
  return options[0]?.value || options[0]?.id
}

export function getFirstLookupValue(lookup?: Record<string, string>) {
  return Object.keys(lookup || {})[0]
}
