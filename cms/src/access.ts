export interface StoredUserAccess {
  id: string
  email: string
  fullName: string
  role: string
  activeRole?: string
  roleMain?: string
  disabledModules?: string[]
  actionPermissions?: Record<string, string[]>
}

function readStoredUser(): StoredUserAccess | null {
  try {
    return JSON.parse(localStorage.getItem("clinic-user") || "null")
  } catch {
    return null
  }
}

function isAdmin(user: StoredUserAccess | null) {
  return !user || (user.roleMain || user.role) === "ADMIN"
}

export function hasResourceAccess(resource: string) {
  const user = readStoredUser()
  if (!user) return true
  return !(user?.disabledModules || []).includes(resource)
}

export function hasScreenAccess(screen: string) {
  if (screen === "zalo-inbox") return Boolean(readStoredUser())
  return isAdmin(readStoredUser())
}

export function hasActionAccess(resource: string, action: string) {
  const user = readStoredUser()
  if (!user) return true
  const allowedActions = user?.actionPermissions?.[resource]
  if (!Array.isArray(allowedActions) || allowedActions.length === 0) return true
  return allowedActions.includes(action)
}

export function currentUserRoleKey() {
  const user = readStoredUser()
  return user?.activeRole || user?.role
}
