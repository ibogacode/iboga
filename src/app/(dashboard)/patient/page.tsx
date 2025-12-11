import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Patient Dashboard',
}

export default function PatientDashboardPage() {
  redirect('/dashboard')
}
