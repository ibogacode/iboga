'use client'

import { useRouter } from 'next/navigation'
import { FileText, Shield, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PatientTask } from '@/actions/patient-tasks.action'

interface PendingTasksCardProps {
  tasks?: PatientTask[]
}

function getTaskIcon(type: PatientTask['type']) {
  switch (type) {
    case 'intake':
      return <FileText className="w-6 h-6" />
    case 'medical_history':
      return <ClipboardList className="w-6 h-6" />
    case 'service_agreement':
      return <Shield className="w-6 h-6" />
    default:
      return <FileText className="w-6 h-6" />
  }
}

function getStatusStyles(status: PatientTask['status'], isRequired: boolean) {
  if (status === 'completed') {
    return {
      bg: 'bg-[#DEF8EE]',
      text: 'text-[#10B981]',
      label: 'Completed',
    }
  }
  if (status === 'in_progress') {
    return {
      bg: 'bg-[#DBEAFE]',
      text: 'text-[#1D4ED8]',
      label: 'In Progress',
    }
  }
  if (isRequired) {
    return {
      bg: 'bg-[#FEE2E2]',
      text: 'text-[#E7000B]',
      label: 'Required',
    }
  }
  return {
    bg: 'bg-[#FFFBD4]',
    text: 'text-[#F59E0B]',
    label: 'Not Started',
  }
}

export function PendingTasksCard({ tasks = [] }: PendingTasksCardProps) {
  const router = useRouter()

  const handleTaskClick = (task: PatientTask) => {
    if (task.link) {
      router.push(task.link)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-medium leading-[1.193em] tracking-[-0.04em] text-black">
          Your Pending Tasks
        </h3>
        <div className="w-px h-[15px] bg-[#6B7280] hidden sm:block" />
      </div>

      {/* Tasks Grid or Empty State */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#F5F4F0] flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10 text-[#777777]" />
          </div>
          <p className="text-sm sm:text-base font-medium leading-[1.193em] tracking-[-0.04em] text-black mb-2">
            No Pending Tasks
          </p>
          <p className="text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] text-[#777777] max-w-sm">
            You're all caught up! There are no pending tasks at the moment.
          </p>
        </div>
      ) : (
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {tasks.slice(0, 2).map((task) => {
            const statusStyles = getStatusStyles(task.status, task.isRequired)
            const buttonText = 'Start'
            const buttonVariant = 'primary'
            
            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6 pb-3 sm:pb-3.5 rounded-lg sm:rounded-[13px] bg-[#F5F4F0]"
              >
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-[10px] bg-white shrink-0">
                  {getTaskIcon(task.type)}
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
                        {statusStyles.label}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleTaskClick(task)}
                      className={`
                        px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] min-h-[44px]
                        ${buttonVariant === 'primary' 
                          ? 'bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90' 
                          : 'bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50'
                        }
                      `}
                    >
                      {buttonText}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Second Row */}
        {tasks.length > 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {tasks.slice(2).map((task) => {
              const statusStyles = getStatusStyles(task.status, task.isRequired)
              const buttonText = 'Start'
              const buttonVariant = 'primary'
              
              return (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6 pb-3 sm:pb-3.5 rounded-lg sm:rounded-[13px] bg-[#F5F4F0]"
                >
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-[10px] bg-white shrink-0">
                    {getTaskIcon(task.type)}
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
                          {statusStyles.label}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleTaskClick(task)}
                        className={`
                          px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-[1.193em] tracking-[-0.04em] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.05)] min-h-[44px]
                          ${buttonVariant === 'primary' 
                            ? 'bg-[#6E7A46] text-white hover:bg-[#6E7A46]/90' 
                            : 'bg-white border border-[#D6D2C8] text-[#777777] hover:bg-gray-50'
                          }
                        `}
                      >
                        {buttonText}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}
    </div>
  )
}

