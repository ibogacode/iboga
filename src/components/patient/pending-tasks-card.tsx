'use client'

import { FileText, Upload, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Task {
  icon: React.ReactNode
  title: string
  description: string
  status: 'not-started' | 'in-progress' | 'completed' | 'required'
  statusLabel: string
  buttonText: string
  buttonVariant: 'primary' | 'secondary'
}

const tasks: Task[] = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Medical Health History',
    description: 'Helps our medical team prepare for your treatment.',
    status: 'not-started',
    statusLabel: 'Not Started',
    buttonText: 'Start',
    buttonVariant: 'primary',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Ibogaine Treatment Consent',
    description: 'Please review and sign the consent agreement.',
    status: 'in-progress',
    statusLabel: 'In Progress (2 / 5)',
    buttonText: 'Start',
    buttonVariant: 'primary',
  },
  {
    icon: <Upload className="w-6 h-6" />,
    title: 'Upload Recent Lab Results',
    description: 'Blood work completed within the last 90 days.',
    status: 'required',
    statusLabel: 'Required',
    buttonText: 'Start',
    buttonVariant: 'primary',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Privacy Policy',
    description: 'Completed and saved to your documents.',
    status: 'completed',
    statusLabel: 'Completed',
    buttonText: 'View',
    buttonVariant: 'secondary',
  },
]

function getStatusStyles(status: Task['status']) {
  switch (status) {
    case 'not-started':
      return {
        bg: 'bg-[#FFFBD4]',
        text: 'text-[#F59E0B]',
      }
    case 'in-progress':
      return {
        bg: 'bg-[#DBEAFE]',
        text: 'text-[#1D4ED8]',
      }
    case 'required':
      return {
        bg: 'bg-[#FEE2E2]',
        text: 'text-[#E7000B]',
      }
    case 'completed':
      return {
        bg: 'bg-[#DEF8EE]',
        text: 'text-[#10B981]',
      }
  }
}

export function PendingTasksCard() {
  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Your Pending Tasks
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
        <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
          Required items appear first. You can return anytime to continue where you left off.
        </p>
      </div>

      {/* Tasks Grid */}
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {tasks.slice(0, 2).map((task, index) => {
            const statusStyles = getStatusStyles(task.status)
            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6 pb-3 sm:pb-3.5 rounded-lg sm:rounded-[13px] bg-[#F5F4F0]"
              >
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-[10px] bg-white shrink-0">
                  {task.icon}
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-medium leading-[1.193em] tracking-[-0.04em] text-black">
                    {task.title}
                  </h4>
                  <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5 flex-wrap">
                    <div className={`flex items-center justify-center gap-0.5 px-2 sm:px-3 py-0 rounded-[10px] ${statusStyles.bg}`}>
                      <span className={`text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] ${statusStyles.text}`}>
                        {task.statusLabel}
                      </span>
                    </div>
                    <Button
                      className={`
                        px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] min-h-[44px]
                        ${task.buttonVariant === 'primary' 
                          ? 'bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90' 
                          : 'bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50'
                        }
                      `}
                    >
                      {task.buttonText}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {tasks.slice(2).map((task, index) => {
            const statusStyles = getStatusStyles(task.status)
            return (
              <div
                key={index + 2}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6 pb-3 sm:pb-3.5 rounded-lg sm:rounded-[13px] bg-[#F5F4F0]"
              >
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-[10px] bg-white shrink-0">
                  {task.icon}
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-medium leading-[1.193em] tracking-[-0.04em] text-black">
                    {task.title}
                  </h4>
                  <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777]">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5 flex-wrap">
                    <div className={`flex items-center justify-center gap-0.5 px-2 sm:px-3 py-0 rounded-[10px] ${statusStyles.bg}`}>
                      <span className={`text-[10px] sm:text-xs leading-[1.193em] tracking-[-0.04em] ${statusStyles.text}`}>
                        {task.statusLabel}
                      </span>
                    </div>
                    <Button
                      className={`
                        px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] min-h-[44px]
                        ${task.buttonVariant === 'primary' 
                          ? 'bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90' 
                          : 'bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50'
                        }
                      `}
                    >
                      {task.buttonText}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

