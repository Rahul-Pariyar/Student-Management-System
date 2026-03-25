import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Building2, CreditCard, LogOut,
  Menu, ChevronLeft, UserCircle, X, Settings,
} from 'lucide-react'

const navItems = [
  { to: '/super-admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
]

export default function SuperAdminLayout() {
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 lg:hidden shrink-0">
        <h1 className="text-xl font-bold text-purple-600">EduFlow <span className="text-xs font-normal text-gray-400">Super Admin</span></h1>
        <button className="rounded-lg p-2 hover:bg-gray-50" onClick={() => setMobileOpen(true)}>
          <Menu className="h-6 w-6 text-purple-600" />
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-300 ease-in-out flex flex-col
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}>

        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white text-purple-600 shadow-sm hover:bg-gray-50 z-50">
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={20} />}
        </button>

        <div className={`flex h-20 items-center px-6 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="cursor-pointer" onClick={() => { navigate('/super-admin/dashboard'); setMobileOpen(false) }}>
            {isCollapsed
              ? <p className="text-[10px] font-bold text-purple-600">SA</p>
              : <div><p className="text-lg font-bold text-purple-600">EduFlow</p><p className="text-[10px] text-gray-400">Super Admin</p></div>
            }
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        <hr className="h-px border-0 bg-gray-200" />

        <nav className="flex-1 space-y-1 px-3 overflow-y-auto pt-2">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : ''}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl transition-all duration-200 py-3 ${isCollapsed ? 'justify-center' : 'px-4'}
                ${isActive ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600'}`
              }>
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className={`flex items-center gap-3 rounded-xl bg-gray-50 ${isCollapsed ? 'justify-center p-2' : 'p-3'}`}>
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-purple-100 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-purple-600" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.full_name || user?.username}</p>
                <p className="text-[10px] text-gray-500">Super Admin</p>
              </div>
            )}
          </div>
          <button onClick={logout}
            className={`flex w-full items-center gap-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 ${isCollapsed ? 'justify-center py-3' : 'px-4 py-3'}`}>
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <main className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="p-6 lg:p-10 mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
