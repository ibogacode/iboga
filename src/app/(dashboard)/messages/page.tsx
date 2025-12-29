import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesClient } from './messages-client'
import { getUserConversations } from './actions'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/messages')

  const { conversations } = await getUserConversations(user.id)

  return <MessagesClient userId={user.id} initialConversations={conversations} />
}
