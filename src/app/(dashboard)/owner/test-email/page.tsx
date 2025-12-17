'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendEmail } from '@/actions/email.action'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react'

export default function TestEmailPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('Test Email from Iboga Wellness Centers')
  const [body, setBody] = useState('<h1>Hello!</h1><p>This is a test email from Iboga Wellness Centers.</p>')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSendEmail() {
    if (!to) {
      toast.error('Please enter a recipient email')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await sendEmail({ to, subject, body })
      
      if (response?.data?.success) {
        setResult({ success: true, message: `Email sent! Message ID: ${response.data.messageId}` })
        toast.success('Email sent successfully!')
      } else {
        const errorMsg = response?.data?.error || response?.serverError || 'Unknown error'
        setResult({ success: false, message: errorMsg })
        toast.error(`Failed: ${errorMsg}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setResult({ success: false, message: errorMsg })
      toast.error(`Error: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 
        style={{ 
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '44px',
          fontWeight: 400,
          color: 'black',
        }}
        className="mb-2"
      >
        Test Email
      </h1>
      <p className="text-gray-600 mb-8">Send a test email to verify the email system is working.</p>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <Label htmlFor="to">Recipient Email *</Label>
          <Input
            id="to"
            type="email"
            placeholder="test@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="body">Body (HTML)</Label>
          <Textarea
            id="body"
            placeholder="Email body (HTML supported)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mt-1 font-mono text-sm"
          />
        </div>

        <Button 
          onClick={handleSendEmail} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Test Email
            </>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {result.success ? (
              <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{result.success ? 'Success!' : 'Failed'}</p>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

