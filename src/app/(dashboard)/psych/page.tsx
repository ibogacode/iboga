import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Psychologist Dashboard',
}

export default function PsychDashboardPage() {
  redirect('/dashboard')
}
