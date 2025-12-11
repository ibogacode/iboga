import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Owner Dashboard',
}

export default function OwnerDashboardPage() {
  redirect('/dashboard')
}
