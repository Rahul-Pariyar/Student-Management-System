/** Role constants matching backend user_type choices */
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
}

/** Map role → default landing route */
export const ROLE_HOME = {
  [ROLES.ADMIN]: '/dashboard',
  [ROLES.TEACHER]: '/dashboard',
  [ROLES.STUDENT]: '/dashboard',
  [ROLES.PARENT]: '/dashboard',
}
