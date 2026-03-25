import { useAuth } from '../../contexts/AuthContext'
import { ShieldAlert, LogOut } from 'lucide-react'

export default function ImpersonationBanner() {
  const { impersonation, exitImpersonation } = useAuth()
  if (!impersonation) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-purple-600 text-white px-4 py-2 flex items-center justify-between text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        <span>
          You are viewing as <strong>{impersonation.tenant_name}</strong> — changes you make affect this tenant's data.
        </span>
      </div>
      <button
        onClick={exitImpersonation}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
        Exit
      </button>
    </div>
  )
}
