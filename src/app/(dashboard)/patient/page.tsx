import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Calendar, FileText, Pill } from 'lucide-react'

export const metadata = {
  title: 'Patient Dashboard',
}

export default function PatientDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground">
          Track your health and treatment progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Treatment Day"
          value="Day 5"
          description="of 14 day program"
          icon={Heart}
        />
        <StatsCard
          title="Next Appointment"
          value="2:00 PM"
          description="With Dr. Smith"
          icon={Calendar}
        />
        <StatsCard
          title="Forms"
          value="2"
          description="Pending completion"
          icon={FileText}
        />
        <StatsCard
          title="Medications"
          value="3"
          description="Due today"
          icon={Pill}
        />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
            <CardDescription>Your activities for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Schedule will be displayed here...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Progress</CardTitle>
            <CardDescription>Your treatment progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Progress charts will be displayed here...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
}

function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

