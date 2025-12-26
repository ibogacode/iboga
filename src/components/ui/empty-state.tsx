import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="mb-4 text-gray-400 animate-fade-in">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 animate-fade-in-up">
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {description}
      </p>
      {action && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * Common empty state variants
 */
export function EmptyStateNoData({ 
  title = "No data available",
  description = "There's nothing to display here yet.",
  action
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title={title}
      description={description}
      action={action}
    />
  )
}

export function EmptyStateNotFound({ 
  title = "Not found",
  description = "The item you're looking for doesn't exist.",
  action
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      title={title}
      description={description}
      action={action}
    />
  )
}

