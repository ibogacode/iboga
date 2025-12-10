import { createSafeActionClient } from 'next-safe-action'

// Base action client
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error('Action error:', error)
    return error.message || 'An unexpected error occurred'
  },
})

// Action client with auth - requires user to be logged in
// You can extend this to check for specific roles
export const authActionClient = actionClient.use(async ({ next }) => {
  // In a real app, you'd check the session here
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) throw new Error('Unauthorized')
  
  return next({ ctx: {} })
})


