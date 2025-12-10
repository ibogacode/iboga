import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Car, Plane, Calendar, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Driver Dashboard',
}

export default function DriverDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Driver Dashboard</h1>
        <p className="text-muted-foreground">
          Transport schedules and flight pickups
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Trips"
          value="5"
          description="Scheduled"
          icon={Car}
        />
        <StatsCard
          title="Airport Pickups"
          value="2"
          description="Today"
          icon={Plane}
        />
        <StatsCard
          title="This Week"
          value="18"
          description="Total trips"
          icon={Calendar}
        />
        <StatsCard
          title="Locations"
          value="3"
          description="Serving"
          icon={MapPin}
        />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
            <CardDescription>Your transport assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Schedule will be displayed here...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Flights</CardTitle>
            <CardDescription>Patients arriving by air</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Flight information will be displayed here...
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

