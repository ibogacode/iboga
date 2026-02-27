'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getResearchRecentActivity } from '@/actions/research.action'
import { UserPlus, CheckCircle, ClipboardList, FileCheck, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function anonymizeId(uuid: string | null | undefined): string {
  if (!uuid) return 'P-0000'
  const hex = uuid.replace(/-/g, '').slice(-4)
  return `P-${hex.toUpperCase()}`
}

export function RecentActivityFeed() {
  const router = useRouter()
  const [items, setItems] = useState<{ type: string; patientId: string | null; label: string; at: string }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getResearchRecentActivity({})
    if (result?.data?.success && result.data.data) {
      setItems(result.data.data as { type: string; patientId: string | null; label: string; at: string }[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function getIcon(type: string) {
    switch (type) {
      case 'admitted':
        return <UserPlus className="h-4 w-4 text-blue-400" />
      case 'discharged':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'medical_update':
        return <ClipboardList className="h-4 w-4 text-purple-500" />
      case 'onboarding_completed':
        return <FileCheck className="h-4 w-4 text-amber-500" />
      default:
        return <ClipboardList className="h-4 w-4 text-gray-400" />
    }
  }

  function handleClick(patientId: string | null) {
    if (patientId) router.push(`/patient-pipeline/patient-profile/${patientId}`)
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Latest activity</h3>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-900"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading && items.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No recent activity</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={`${item.at}-${i}`}>
                <button
                  type="button"
                  onClick={() => handleClick(item.patientId)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                    item.patientId && 'hover:bg-gray-800'
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800">
                    {getIcon(item.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">
                      {item.patientId ? anonymizeId(item.patientId) : '—'}
                    </span>
                    <span className="ml-1 text-gray-600">{item.label}</span>
                    <span className="ml-1 text-gray-500">· {formatDistanceToNow(new Date(item.at), { addSuffix: true })}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
