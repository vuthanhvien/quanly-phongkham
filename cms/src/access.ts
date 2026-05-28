export interface StoredUserAccess {
  id: string
  email: string
  fullName: string
  role: string
  activeRole?: string
  roleMain?: string
  disabledModules?: string[]
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
  if (isAdmin(user)) return true
  return !(user?.disabledModules || []).includes(resource)
}

export function hasScreenAccess(screen: string) {
  void screen
  return isAdmin(readStoredUser())
}

export function currentUserRoleKey() {
  const user = readStoredUser()
  return user?.activeRole || user?.role
}