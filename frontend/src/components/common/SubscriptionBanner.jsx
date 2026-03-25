import { useEffect, useState } from 'react'
import { accountService } from '../../services'
import { AlertTriangle, Clock, X } from 'lucide-react'

export default function SubscriptionBanner() {
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    accountService.getSubscriptionStatus?.()
      .then(r => setStatus(r.data))
      .catch(() => {})
  }, [])

  if (!status || dismissed) return null

  const { days_left, plan_display, tenant_status, payment_status } = status

  // Only show banner if something needs attention
  const showExpiry = days_left !== null && days_left <= 14
  const showPayment = payment_status === 'unpaid'
  const showSuspended = tenant_status === 'suspended'

  if (!showExpiry && !showPayment && !showSuspended) return null

  const bgColor = showSuspended ? 'bg-red-50 border-red-200 text-red-800'
    : showPayment ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
    : 'bg-orange-50 border-orange-200 text-orange-800'

  const message = showSuspended
    ? 'Your account has been suspended. Please contact support.'
    : showPayment
    ? `Payment pending for ${plan_display} plan. Please complete payment to avoid service interruption.`
    : `Your ${plan_display} subscription expires in ${days_left} day${days_left !== 1 ? 's' : ''}.`

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl mb-4 text-sm ${bgColor}`}>
      {showSuspended ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <Clock className="h-4 w-4 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-black/5">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
