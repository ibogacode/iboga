import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, ClipboardList, Pill } from 'lucide-react'

export const metadata = {
  title: 'Nurse Dashboard',
}

export default function NurseDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nurse Dashboard</h1>
        <p className="text-muted-foreground">
          Patient care and daily monitoring
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Patients Today"
          value="15"
          description="Requiring attention"
          icon={Users}
        />
        <StatsCard
          title="Vitals Due"
          value="8"
          description="Pending checks"
          icon={Activity}
        />
        <StatsCard
          title="Visit Forms"
          value="4"
          description="To complete"
          icon={ClipboardList}
        />
        <StatsCard
          title="Medications"
          value="12"
          description="To administer"
          icon={Pill}
        />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Tasks will be displayed here...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Vitals</CardTitle>
            <CardDescription>Latest patient vital readings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Vitals data will be displayed here...
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


