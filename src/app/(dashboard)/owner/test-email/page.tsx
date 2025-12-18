'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendEmail } from '@/actions/email.action'
import { checkCalendarBooking } from '@/actions/calendar.action'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react'

type Tab = 'email' | 'calendar'

export default function TestEmailPage() {
  const [activeTab, setActiveTab] = useState<Tab>('email')
  
  // Email test state
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('Test Email from Iboga Wellness Centers')
  const [body, setBody] = useState('<h1>Hello!</h1><p>This is a test email from Iboga Wellness Centers.</p>')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // Calendar test state
  const [checkEmail, setCheckEmail] = useState('')
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [calendarResult, setCalendarResult] = useState<{ 
    success: boolean
    message: string
    data?: { hasBooking: boolean; events: any[] }
  } | null>(null)

  async function handleSendEmail() {
    if (!to) {
      toast.error('Please enter a recipient email')
      return
    }

    setIsLoadingEmail(true)
    setEmailResult(null)

    try {
      const response = await sendEmail({ to, subject, body })
      
      if (response?.data?.success) {
        setEmailResult({ success: true, message: `Email sent! Message ID: ${response.data.messageId}` })
        toast.success('Email sent successfully!')
      } else {
        const errorMsg = response?.data?.error || response?.serverError || 'Unknown error'
        setEmailResult({ success: false, message: errorMsg })
        toast.error(`Failed: ${errorMsg}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setEmailResult({ success: false, message: errorMsg })
      toast.error(`Error: ${errorMsg}`)
    } finally {
      setIsLoadingEmail(false)
    }
  }

  async function handleCheckCalendar() {
    if (!checkEmail) {
      toast.error('Please enter an email to check')
      return
    }

    setIsLoadingCalendar(true)
    setCalendarResult(null)

    try {
      const response = await checkCalendarBooking({ email: checkEmail })
      
      if (response?.data?.success) {
        const data = response.data.data
        const hasBooking = data?.hasBooking || false
        const events = data?.events || []
        
        if (hasBooking) {
          setCalendarResult({
            success: true,
            message: `Found ${events.length} booking(s) for this email`,
            data: { hasBooking, events },
          })
          toast.success(`Found ${events.length} booking(s)!`)
        } else {
          setCalendarResult({
            success: true,
            message: 'No bookings found for this email',
            data: { hasBooking: false, events: [] },
          })
          toast.info('No bookings found')
        }
      } else {
        const errorMsg = response?.data?.error || response?.serverError || 'Unknown error'
        setCalendarResult({ success: false, message: errorMsg })
        toast.error(`Failed: ${errorMsg}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setCalendarResult({ success: false, message: errorMsg })
      toast.error(`Error: ${errorMsg}`)
    } finally {
      setIsLoadingCalendar(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 
        style={{ 
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: '44px',
          fontWeight: 400,
          color: 'black',
        }}
        className="mb-2"
      >
        Test Gmail & Calendar APIs
      </h1>
      <p className="text-gray-600 mb-8">Test Gmail sending and Calendar event checking functionality.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'email'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="inline-block mr-2 h-4 w-4" />
          Test Gmail API
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="inline-block mr-2 h-4 w-4" />
          Test Calendar API
        </button>
      </div>

      {/* Email Test Section */}
      {activeTab === 'email' && (
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
            disabled={isLoadingEmail}
            className="w-full"
          >
            {isLoadingEmail ? (
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

          {emailResult && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              emailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {emailResult.success ? (
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{emailResult.success ? 'Success!' : 'Failed'}</p>
                <p className="text-sm mt-1">{emailResult.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Test Section */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <Label htmlFor="checkEmail">Email to Check *</Label>
            <Input
              id="checkEmail"
              type="email"
              placeholder="user@example.com"
              value={checkEmail}
              onChange={(e) => setCheckEmail(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the email address to check for calendar bookings
            </p>
          </div>

          <Button 
            onClick={handleCheckCalendar} 
            disabled={isLoadingCalendar}
            className="w-full"
          >
            {isLoadingCalendar ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Check Calendar Bookings
              </>
            )}
          </Button>

          {calendarResult && (
            <div className={`p-4 rounded-lg ${
              calendarResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {calendarResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{calendarResult.success ? 'Success!' : 'Failed'}</p>
                  <p className="text-sm mt-1">{calendarResult.message}</p>
                  
                  {calendarResult.data?.hasBooking && calendarResult.data.events.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="font-medium text-sm">Found Events:</p>
                      {calendarResult.data.events.map((event: any, index: number) => (
                        <div key={index} className="bg-white/50 p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 mt-0.5 text-green-600" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.summary || 'Untitled Event'}</p>
                              <p className="text-xs mt-1">
                                Start: {new Date(event.start).toLocaleString()}
                              </p>
                              <p className="text-xs">
                                Status: {event.attendeeStatus || 'unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

