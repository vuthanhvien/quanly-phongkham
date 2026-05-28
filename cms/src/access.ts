export interface StoredUserAccess {
  id: string
  email: string
  fullName: string
  role: string
  activeRole?: string
  roleMain?: string
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
  void resource
  return true
}

export function hasScreenAccess(screen: string) {
  void screen
  return isAdmin(readStoredUser())
}

export function currentUserRoleKey() {
  const user = readStoredUser()
  return user?.activeRole || user?.role
}