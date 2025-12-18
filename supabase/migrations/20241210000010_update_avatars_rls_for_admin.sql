-- Update RLS policy for avatars storage to allow admin access
-- Drop existing policy
DROP POLICY IF EXISTS "Staff can upload avatars for others" ON storage.objects;

-- Recreate policy to include admin role
CREATE POLICY "Staff can upload avatars for others"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role IN ('owner', 'admin', 'manager', 'doctor', 'psych', 'nurse')
    )
  );
