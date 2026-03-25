import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading, impersonation } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Super admin impersonating a tenant — allow access to admin routes
  if (impersonation && allowedRoles?.includes('admin') && user?.user_type === 'super_admin') {
    return children
  }

  if (allowedRoles && !allowedRoles.includes(user?.user_type)) {
    const dashPath = user?.user_type === 'super_admin'
      ? '/super-admin/dashboard'
      : `/${user?.user_type}/dashboard`
    return <Navigate to={dashPath} replace />
  }

  return children
}
