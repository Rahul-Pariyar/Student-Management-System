import { useEffect, useState } from 'react'
import { tenantService } from '../../services'
import { Building2, Users, TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tenantService.getOverview()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (!data) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">All tenants across EduFlow</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Total Tenants" value={data.total_tenants} color="blue" />
        <StatCard icon={Users} label="Active" value={data.active_tenants} color="green" />
        <StatCard icon={Clock} label="Trial" value={data.trial_tenants} color="yellow" />
        <StatCard icon={AlertTriangle} label="Suspended" value={data.suspended_tenants} color="red" />
        <StatCard icon={TrendingUp} label="Expiring Soon" value={data.expiring_soon} color="purple" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`₹${Number(data.total_revenue).toLocaleString()}`} color="green" />
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Active Subscriptions by Plan</h2>
        <div className="flex flex-wrap gap-3">
          {data.plan_distribution.map(p => (
            <div key={p.plan__name} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
              <span className="text-sm font-medium text-gray-700">{p.plan__display_name}</span>
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tenants */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Tenants</h2>
        <div className="space-y-3">
          {data.recent_tenants.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400">{t.slug}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                t.status === 'active' ? 'bg-green-100 text-green-700' :
                t.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                t.status === 'suspended' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
