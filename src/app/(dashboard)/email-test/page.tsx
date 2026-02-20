'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sendTestDirectEmailAction, sendTestEmailTemplateAction } from '@/actions/email.action'
import {
  getAllEmailTestEntries,
  type DirectEmailTestKind,
  type EmailTemplateType,
} from '@/constants/email-templates'
import { toast } from 'sonner'
import { Mail, Loader2 } from 'lucide-react'

export default function EmailTestPage() {
  const entries = useMemo(() => getAllEmailTestEntries(), [])
  const [email, setEmail] = useState('')
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? '')
  const [sending, setSending] = useState(false)

  const selected = entries.find((e) => e.id === selectedId) ?? entries[0]

  async function handleSend() {
    const to = email.trim()
    if (!to) {
      toast.error('Please enter an email address')
      return
    }
    if (!selected) return
    setSending(true)
    try {
      const result =
        selected.source === 'template'
          ? await sendTestEmailTemplateAction({ type: selected.id as EmailTemplateType, to })
          : await sendTestDirectEmailAction({ kind: selected.id as DirectEmailTestKind, to })
      if (result?.data?.success) {
        toast.success(`Test email sent to ${to} (${selected.label})`)
      } else {
        toast.error((result?.data as { error?: string })?.error ?? result?.serverError ?? 'Failed to send email')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container max-w-lg py-8">
      <div className="rounded-lg border border-[#D6D2C8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-[#2B2820]">
          <Mail className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Email test</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Send a test for any email we send (templates via Supabase, direct emails from Actions).
          Enter the recipient email, choose the type, then click Send.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-[#D6D2C8]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-type">Email type</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="email-type" className="border-[#D6D2C8]">
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className={e.source === 'direct' ? 'text-muted-foreground' : ''}>
                      {e.label}
                      {e.source === 'template' ? ' (template)' : ' (direct)'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full rounded-full bg-[#5D7A5F] hover:bg-[#4a6350]"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send test email'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
