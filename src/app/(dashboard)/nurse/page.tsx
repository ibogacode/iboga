import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Nurse Dashboard',
}

export default function NurseDashboardPage() {
  redirect('/dashboard')
}
