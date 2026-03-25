import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, accountService } from '../services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [impersonation, setImpersonation] = useState(() => {
    const stored = localStorage.getItem('impersonation_data')
    return stored ? JSON.parse(stored) : null
  })
  const navigate = useNavigate()

  // Load user from stored token on mount
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const { data } = await accountService.getMe()
      setUser(data)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (username, password) => {
    const { data } = await authService.login(username, password)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    await loadUser()
    return data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('impersonation_token')
    localStorage.removeItem('impersonation_data')
    setImpersonation(null)
    setUser(null)
    navigate('/login')
  }

  const startImpersonation = (tokenData) => {
    // tokenData = { token, tenant_id, tenant_name, tenant_slug }
    localStorage.setItem('impersonation_token', tokenData.token)
    localStorage.setItem('impersonation_data', JSON.stringify(tokenData))
    setImpersonation(tokenData)
    navigate('/admin/dashboard')
  }

  const exitImpersonation = () => {
    localStorage.removeItem('impersonation_token')
    localStorage.removeItem('impersonation_data')
    setImpersonation(null)
    navigate('/super-admin/tenants')
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin: user?.user_type === 'super_admin',
    isAdmin: user?.user_type === 'admin',
    isTeacher: user?.user_type === 'teacher',
    isStudent: user?.user_type === 'student',
    isParent: user?.user_type === 'parent',
    impersonation,
    startImpersonation,
    exitImpersonation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
