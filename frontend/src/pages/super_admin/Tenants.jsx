import { useEffect, useState } from 'react'
import { tenantService } from '../../services'
import { Plus, Search, MoreVertical, Building2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
}

function CreateTenantModal({ plans, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', slug: '', email: '', phone: '', address: '',
    plan: '', admin_username: '', admin_email: '', admin_password: '',
    admin_first_name: '', admin_last_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await tenantService.createTenant(form)
      onCreated(data)
      onClose()
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Error creating tenant'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create New Tenant</h2>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Organization</p>
          {[
            { name: 'name', placeholder: 'School Name', required: true },
            { name: 'slug', placeholder: 'slug (e.g. greenwood-school)', required: true },
            { name: 'email', placeholder: 'Contact Email', type: 'email', required: true },
            { name: 'phone', placeholder: 'Phone' },
            { name: 'address', placeholder: 'Address' },
          ].map(f => (
            <input key={f.name} name={f.name} type={f.type || 'text'}
              placeholder={f.placeholder} required={f.required}
              value={form[f.name]} onChange={handle}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Plan</label>
            <select name="plan" required value={form.plan} onChange={handle}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select a plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.display_name} — ₹{p.price} / {p.duration_months}mo</option>
              ))}
            </select>
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Org Admin Account</p>
          {[
            { name: 'admin_first_name', placeholder: 'First Name' },
            { name: 'admin_last_name', placeholder: 'Last Name' },
            { name: 'admin_username', placeholder: 'Username', required: true },
            { name: 'admin_email', placeholder: 'Admin Email', type: 'email', required: true },
            { name: 'admin_password', placeholder: 'Password', type: 'password', required: true },
          ].map(f => (
            <input key={f.name} name={f.name} type={f.type || 'text'}
              placeholder={f.placeholder} required={f.required}
              value={form[f.name]} onChange={handle}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)
  const { startImpersonation } = useAuth()

  const load = async () => {
    setLoading(true)
    const [t, p] = await Promise.all([
      tenantService.listTenants({ search }),
      tenantService.listPlans(),
    ])
    setTenants(t.data.results || t.data)
    setPlans(p.data.results || p.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  const handleSuspend = async (id) => {
    await tenantService.suspendTenant(id)
    setActionMenu(null)
    load()
  }

  const handleActivate = async (id) => {
    await tenantService.activateTenant(id)
    setActionMenu(null)
    load()
  }

  const handleImpersonate = async (id) => {
    const { data } = await tenantService.impersonateTenant(id)
    setActionMenu(null)
    startImpersonation(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all organizations</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Tenant
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tenants..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No tenants found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Organization', 'Slug', 'Email', 'Status', 'Plan', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="font-medium text-gray-900">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{t.slug}</td>
                  <td className="px-5 py-4 text-gray-500">{t.email}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {t.active_subscription?.plan_name || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative inline-block">
                    <button onClick={() => setActionMenu(actionMenu === t.id ? null : t.id)}
                      className="p-1 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                    {actionMenu === t.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                          <button onClick={() => handleImpersonate(t.id)}
                            className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-gray-50">
                            Login as Admin
                          </button>
                          {t.status !== 'active' && (
                            <button onClick={() => handleActivate(t.id)}
                              className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-50">
                              Activate
                            </button>
                          )}
                          {t.status !== 'suspended' && (
                            <button onClick={() => handleSuspend(t.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                              Suspend
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateTenantModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  )
}
