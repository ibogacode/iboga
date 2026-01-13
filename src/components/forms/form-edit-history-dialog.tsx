'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { getFormEditHistory } from '@/actions/patient-management.action'
import { formatDistanceToNow } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { getFieldLabel, formatFieldValue } from '@/lib/form-field-labels'

// Format date/time to MMDDYYYY and 12-hour EST time
function formatDateTimeEST(dateString: string): { date: string; time: string } {
  const date = new Date(dateString)
  
  // Convert to EST/EDT timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  const parts = formatter.formatToParts(date)
  const month = parts.find(p => p.type === 'month')?.value || ''
  const day = parts.find(p => p.type === 'day')?.value || ''
  const year = parts.find(p => p.type === 'year')?.value || ''
  const hour = parts.find(p => p.type === 'hour')?.value || ''
  const minute = parts.find(p => p.type === 'minute')?.value || ''
  const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || ''
  
  // Format date as MMDDYYYY
  const formattedDate = `${month}-${day}-${year}`
  
  // Format time as 12-hour with AM/PM
  const formattedTime = `${hour}:${minute} ${dayPeriod.toUpperCase()}`
  
  return { date: formattedDate, time: formattedTime }
}

interface FormEditHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formTable: string
  formId: string
  formTitle: string
}

export function FormEditHistoryDialog({ open, onOpenChange, formTable, formId, formTitle }: FormEditHistoryDialogProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && formId) {
      loadHistory()
    } else {
      setHistory([])
    }
  }, [open, formTable, formId])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const result = await getFormEditHistory({ formTable, formId })
      if (result?.data?.success) {
        setHistory(result.data.data || [])
      } else {
        console.error('Failed to load edit history:', result?.data?.error)
        setHistory([])
      }
    } catch (error) {
      console.error('Error loading edit history:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit History - {formTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No edits recorded</div>
        ) : (
          <div className="space-y-4">
            {history
              .filter((edit) => {
                // Exclude system/metadata fields from edit history display
                const excludedFields = ['filled_at', 'submitted_at', 'completed_at', 'created_at', 'updated_at']
                return !excludedFields.includes(edit.field_name)
              })
              .map((edit) => {
              const { date, time } = formatDateTimeEST(edit.edited_at)
              return (
                <div key={edit.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{edit.editor_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        {edit.editor_role && (
                          <Badge variant="secondary" className="text-xs">{edit.editor_role}</Badge>
                        )}
                        <span>{formatDistanceToNow(new Date(edit.edited_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 text-right">
                      <div className="font-medium">{date}</div>
                      <div className="text-gray-500">{time} EST</div>
                    </div>
                  </div>

                <div className="bg-gray-50 rounded p-3 space-y-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {getFieldLabel(formTable, edit.field_name)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Old Response:</div>
                      <div className="bg-red-50 border border-red-200 rounded p-2 text-red-900 text-sm break-words">
                        {formatFieldValue(edit.field_name, edit.old_value)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">New Response:</div>
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-green-900 text-sm break-words">
                        {formatFieldValue(edit.field_name, edit.new_value)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
