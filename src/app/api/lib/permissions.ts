export function hasPermission(user: any, permissionName: string) {
  if (!user) return false

  for (const userRole of user.roles) {
    for (const rp of userRole.role.permissions) {
      if (rp.permission.name === permissionName) {
        return true
      }
    }
  }

  return false
}