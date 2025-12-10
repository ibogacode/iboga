import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Brain, Calendar, ClipboardList } from 'lucide-react'

export const metadata = {
  title: 'Psychologist Dashboard',
}

export default function PsychDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Psychologist Dashboard</h1>
        <p className="text-muted-foreground">
          Patient assessments and therapy sessions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="My Patients"
          value="10"
          description="Currently assigned"
          icon={Users}
        />
        <StatsCard
          title="Sessions Today"
          value="4"
          description="Scheduled"
          icon={Calendar}
        />
        <StatsCard
          title="Assessments"
          value="6"
          description="Pending review"
          icon={Brain}
        />
        <StatsCard
          title="Notes"
          value="3"
          description="To complete"
          icon={ClipboardList}
        />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Sessions</CardTitle>
            <CardDescription>Your therapy sessions for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Sessions will be displayed here...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Progress</CardTitle>
            <CardDescription>Recent assessment updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Progress updates will be displayed here...
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

