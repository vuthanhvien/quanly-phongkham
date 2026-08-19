export interface StoredUserAccess {
  id: string
  email: string
  username?: string
  fullName?: string
  role: string
  activeRole?: string
  roleMain?: string
  branchId?: string
  staffId?: string
  disabledModules?: string[]
  actionPermissions?: Record<string, string[]>
  actionPresentation?: Record<string, { labels?: Record<string, string>; orders?: Record<string, number>; inline?: Record<string, boolean> }>
  screenPermissions?: string[]
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

export function isCurrentUserAdmin() {
  return isAdmin(readStoredUser())
}

export function hasResourceAccess(resource: string) {
  const user = readStoredUser()
  if (!user || isAdmin(user)) return true
  return !(user?.disabledModules || []).includes(resource)
}

export function hasScreenAccess(screen: string) {
  const user = readStoredUser()
  void screen
  if (!user || isAdmin(user)) return true
  if (Array.isArray(user.screenPermissions)) return user.screenPermissions.includes(screen)
  return false
}

export function hasActionAccess(resource: string, action: string) {
  const user = readStoredUser()
  if (!user) return true
  const allowedActions = user?.actionPermissions?.[resource]
  if (!Array.isArray(allowedActions)) return true
  return allowedActions.includes(action)
}

export function getActionPresentation(resource: string) {
  return readStoredUser()?.actionPresentation?.[resource] || {}
}

export function currentUserRoleKey() {
  const user = readStoredUser()
  return user?.activeRole || user?.role
}
