import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, ClipboardList, Pill } from 'lucide-react'

export const metadata = {
  title: 'Doctor Dashboard',
}

export default function DoctorDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your patients and treatments
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="My Patients"
          value="12"
          description="Currently assigned"
          icon={Users}
        />
        <StatsCard
          title="Today's Schedule"
          value="5"
          description="Appointments"
          icon={Calendar}
        />
        <StatsCard
          title="Pending Reviews"
          value="3"
          description="Treatment plans"
          icon={ClipboardList}
        />
        <StatsCard
          title="Prescriptions"
          value="8"
          description="Active this week"
          icon={Pill}
        />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Appointments</CardTitle>
            <CardDescription>Your schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Appointments will be displayed here...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Updates</CardTitle>
            <CardDescription>Recent patient status changes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Patient updates will be displayed here...
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

