import { getGlobalBranchFilterIds } from "../api"

export interface SelectOptionLike {
  value?: string
  id?: string
}

export function getFirstOptionValue<T extends SelectOptionLike>(options: T[]) {
  const selectedBranchIds = getGlobalBranchFilterIds()
  const selectedBranch = selectedBranchIds.find((branchId) =>
    options.some((option) => String(option.value || option.id || "") === branchId),
  )
  if (selectedBranch) return selectedBranch
  return options[0]?.value || options[0]?.id
}

export function getFirstLookupValue(lookup?: Record<string, string>) {
  const selectedBranchIds = getGlobalBranchFilterIds()
  const selectedBranch = selectedBranchIds.find((branchId) => Boolean(lookup?.[branchId]))
  if (selectedBranch) return selectedBranch
  return Object.keys(lookup || {})[0]
}
