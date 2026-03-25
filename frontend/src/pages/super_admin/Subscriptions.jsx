import { useEffect, useState } from 'react'
import { tenantService } from '../../services'
import { Plus } from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

const PAYMENT_COLORS = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
  waived: 'bg-blue-100 text-blue-700',
}

function EditSubscriptionModal({ sub, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: sub.status,
    payment_status: sub.payment_status,
    payment_reference: sub.payment_reference || '',
    payment_date: sub.payment_date || '',
    amount_paid: sub.amount_paid || '',
    notes: sub.notes || '',
  })
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await tenantService.updateSubscription(sub.id, form)
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Update Subscription</h2>
          <p className="text-sm text-gray-500 mt-1">{sub.tenant_name || sub.tenant} — {sub.plan_name}</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select name="status" value={form.status} onChange={handle}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['active', 'expired', 'cancelled', 'pending'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Payment Status</label>
              <select name="payment_status" value={form.payment_status} onChange={handle}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['paid', 'unpaid', 'waived'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <input name="payment_reference" placeholder="Payment Reference" value={form.payment_reference} onChange={handle}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="payment_date" type="date" value={form.payment_date} onChange={handle}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="amount_paid" type="number" placeholder="Amount Paid" value={form.amount_paid} onChange={handle}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea name="notes" placeholder="Notes" value={form.notes} onChange={handle} rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    tenantService.listSubscriptions()
      .then(r => setSubs(r.data.results || r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage all tenant subscriptions</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Tenant', 'Plan', 'Status', 'Payment', 'Start', 'End', 'Amount', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subs.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{s.tenant_name || s.tenant}</td>
                  <td className="px-5 py-4 text-gray-600">{s.plan_name}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${PAYMENT_COLORS[s.payment_status]}`}>{s.payment_status}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{s.start_date}</td>
                  <td className="px-5 py-4 text-gray-500">{s.end_date}</td>
                  <td className="px-5 py-4 text-gray-700">₹{Number(s.amount_paid).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => setEditing(s)}
                      className="text-xs text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditSubscriptionModal
          sub={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
