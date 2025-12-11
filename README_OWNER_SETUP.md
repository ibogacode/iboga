# Creating the First Owner Account

There are **3 ways** to create your first owner account:

## Option 1: Automatic (Recommended) ⭐

The database trigger will **automatically make the first user an owner**.

1. **Sign up** at your registration page with any email
2. The first user will automatically be set as `owner` role
3. All subsequent users will default to `patient` role

**Migration**: `20241210000003_create_first_owner_function.sql` handles this automatically.

---

## Option 2: Using SQL Function

After signing up, promote yourself to owner using SQL:

```sql
-- In Supabase SQL Editor
SELECT public.promote_to_owner('your-email@example.com');
```

This function is created by the migration and can be run anytime.

---

## Option 3: Using Script (For Development)

Use the provided TypeScript script:

```bash
# Install tsx if not already installed
npm install -D tsx

# Run the script
npx tsx scripts/create-owner.ts owner@example.com
```

Or set the email in `.env.local`:
```env
OWNER_EMAIL=owner@example.com
```

Then run:
```bash
npx tsx scripts/create-owner.ts
```

---

## Option 4: Manual Update in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor** → `profiles`
2. Find your user by email
3. Click **Edit**
4. Change `role` from `patient` to `owner`
5. Save

---

## Verify Owner Account

Check if you're an owner:

```sql
SELECT id, email, role, first_name, last_name 
FROM public.profiles 
WHERE role = 'owner';
```

Or in your app, check the user profile - it should show `role: 'owner'`.

---

## Important Notes

- ⚠️ **Only the first user** is automatically set as owner
- ⚠️ **Owner role** has full system access
- ⚠️ **Be careful** when promoting users to owner
- ✅ You can use the `promote_to_owner()` function anytime to change roles

---

## Next Steps After Creating Owner

1. **Login** with your owner account
2. **Access** the owner dashboard at `/owner`
3. **Create** organizations and locations (if needed)
4. **Invite** other staff members

