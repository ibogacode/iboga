import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Driver Dashboard',
}

export default function DriverDashboardPage() {
  redirect('/dashboard')
}
