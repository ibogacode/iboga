import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Doctor Dashboard',
}

export default function DoctorDashboardPage() {
  redirect('/dashboard')
}
