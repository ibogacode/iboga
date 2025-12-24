'use client'

import { useState, useEffect } from 'react'
import { Calendar, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)

  // Update local state when props change
  useEffect(() => {
    setLocalFrom(from)
    setLocalTo(to)
  }, [from, to])

  const handleApply = () => {
    if (localFrom && localTo) {
      // Convert date strings to ISO datetime format with timezone
      const fromDate = new Date(localFrom)
      fromDate.setHours(0, 0, 0, 0)
      const toDate = new Date(localTo)
      toDate.setHours(23, 59, 59, 999)
      
      // Format with timezone offset
      const formatWithTimezone = (date: Date) => {
        const offset = -date.getTimezoneOffset()
        const sign = offset >= 0 ? '+' : '-'
        const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
        const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0')
        return `${date.toISOString().split('.')[0]}${sign}${hours}:${minutes}`
      }
      
      onChange(formatWithTimezone(fromDate), formatWithTimezone(toDate))
    }
  }

  const handleQuickSelect = (days: number) => {
    const toDate = new Date()
    toDate.setHours(23, 59, 59, 999)
    const fromDate = new Date(toDate)
    fromDate.setDate(fromDate.getDate() - days)
    fromDate.setHours(0, 0, 0, 0)
    
    // Format with timezone offset
    const formatWithTimezone = (date: Date) => {
      const offset = -date.getTimezoneOffset()
      const sign = offset >= 0 ? '+' : '-'
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0')
      return `${date.toISOString().split('.')[0]}${sign}${hours}:${minutes}`
    }
    
    onChange(formatWithTimezone(fromDate), formatWithTimezone(toDate))
  }

  // Convert ISO datetime back to date string for input
  const fromDateStr = localFrom ? localFrom.split('T')[0] : ''
  const toDateStr = localTo ? localTo.split('T')[0] : ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto justify-start text-left font-normal bg-white border-gray-300 hover:bg-gray-50 h-10"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {fromDateStr && toDateStr ? (
            <span className="text-sm">
              {new Date(fromDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(toDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : (
            <span className="text-gray-500">Select date range</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-4" align="end">
        <div className="space-y-4 min-w-[280px]">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Select</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(7)}
                className="text-xs h-8"
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(30)}
                className="text-xs h-8"
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(90)}
                className="text-xs h-8"
              >
                Last 90 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(365)}
                className="text-xs h-8"
              >
                Last year
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Custom Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="from-date" className="text-xs text-gray-600">
                  From
                </Label>
                <div className="relative">
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDateStr}
                    onChange={(e) => setLocalFrom(e.target.value)}
                    className="h-9 text-sm"
                    max={toDateStr || undefined}
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date" className="text-xs text-gray-600">
                  To
                </Label>
                <div className="relative">
                  <Input
                    id="to-date"
                    type="date"
                    value={toDateStr}
                    onChange={(e) => setLocalTo(e.target.value)}
                    className="h-9 text-sm"
                    min={fromDateStr || undefined}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <Button
              onClick={handleApply}
              className="w-full h-9 text-sm"
              disabled={!localFrom || !localTo}
            >
              Apply
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

