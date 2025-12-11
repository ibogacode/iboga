/**
 * Script to create or promote a user to owner
 * 
 * Usage:
 *   npx tsx scripts/create-owner.ts owner@example.com
 * 
 * Or set OWNER_EMAIL in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createOwner(email: string) {
  console.log(`\n🔍 Looking for user: ${email}`)
  
  // Check if user exists
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  
  if (userError) {
    console.error('❌ Error fetching users:', userError.message)
    process.exit(1)
  }
  
  const user = users.users.find(u => u.email === email)
  
  if (!user) {
    console.error(`❌ User with email ${email} not found`)
    console.log('\n💡 To create a new owner account:')
    console.log('   1. Sign up at your app\'s registration page')
    console.log('   2. Run this script again with the email')
    process.exit(1)
  }
  
  console.log(`✅ Found user: ${user.id}`)
  
  // Check current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (profileError) {
    console.error('❌ Error fetching profile:', profileError.message)
    process.exit(1)
  }
  
  if (profile.role === 'owner') {
    console.log('✅ User is already an owner!')
    return
  }
  
  // Update to owner
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', user.id)
  
  if (updateError) {
    console.error('❌ Error updating profile:', updateError.message)
    process.exit(1)
  }
  
  console.log('✅ Successfully promoted user to owner!')
  console.log(`\n📧 Email: ${email}`)
  console.log(`🆔 User ID: ${user.id}`)
  console.log(`👤 Role: owner`)
}

// Get email from command line or env
const email = process.argv[2] || process.env.OWNER_EMAIL

if (!email) {
  console.error('❌ Please provide an email address')
  console.log('\nUsage:')
  console.log('  npx tsx scripts/create-owner.ts owner@example.com')
  console.log('\nOr set OWNER_EMAIL in .env.local')
  process.exit(1)
}

createOwner(email)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })

