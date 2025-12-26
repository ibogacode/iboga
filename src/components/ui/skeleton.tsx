import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
      {...props}
    />
  )
}

/**
 * Skeleton variants for common use cases
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-xl bg-white border", className)}>
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-10 w-24 rounded-lg", className)} />
  )
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }
  
  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size])} />
  )
}
