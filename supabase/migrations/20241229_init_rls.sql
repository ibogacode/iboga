-- Final RLS Fix: Ambiguity Resolution (Full Renaming)

-- 1. CLEANUP (Drop broadly to be safe)
DROP POLICY IF EXISTS "Profiles visibility" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Conversations are viewable by participants" ON conversations;
DROP POLICY IF EXISTS "Conversations view" ON conversations;
DROP POLICY IF EXISTS "Conversations insert" ON conversations;
DROP POLICY IF EXISTS "Conversations update" ON conversations;

DROP POLICY IF EXISTS "Participants are viewable by conversation members" ON conversation_participants;
DROP POLICY IF EXISTS "Participants view self only" ON conversation_participants;
DROP POLICY IF EXISTS "Participants insert" ON conversation_participants;
DROP POLICY IF EXISTS "Participants delete" ON conversation_participants;

DROP POLICY IF EXISTS "Messages are viewable by conversation participants" ON messages;
DROP POLICY IF EXISTS "Messages view" ON messages;
DROP POLICY IF EXISTS "Messages insert" ON messages;
DROP POLICY IF EXISTS "Messages update" ON messages;

DROP TRIGGER IF EXISTS on_new_message ON messages;
DROP FUNCTION IF EXISTS public.handle_new_message();
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.is_member_of(UUID);
DROP FUNCTION IF EXISTS public.get_chat_contacts();
DROP FUNCTION IF EXISTS public.get_conversation_members(UUID); 

-- 2. HELPER FUNCTIONS

-- is_member_of: SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_member_of(_conversation_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = _conversation_id 
    AND user_id = auth.uid()
  );
END;
$$;


-- 3. STRICT RLS POLICIES (Lockdown Mode)

-- PROFILES
CREATE POLICY "Profiles visibility"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR
  (role <> 'patient')
);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);


-- CONVERSATIONS
CREATE POLICY "Conversations view"
ON conversations FOR SELECT
TO authenticated
USING (is_member_of(id));

CREATE POLICY "Conversations insert"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Conversations update"
ON conversations FOR UPDATE
TO authenticated
USING (is_member_of(id));


-- PARTICIPANTS
CREATE POLICY "Participants view self only"
ON conversation_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Participants insert"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Participants delete"
ON conversation_participants FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- MESSAGES
CREATE POLICY "Messages view"
ON messages FOR SELECT
TO authenticated
USING (is_member_of(conversation_id));

CREATE POLICY "Messages insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (is_member_of(conversation_id));

CREATE POLICY "Messages update"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());


-- 4. PRIVILEGED ACCESS FUNCTIONS (The Gatekeepers)

-- A. GET CONVERSATION MEMBERS
CREATE OR REPLACE FUNCTION public.get_conversation_members(_conversation_id UUID)
RETURNS TABLE (
    user_id UUID,
    joined_at TIMESTAMPTZ,
    last_read_at TIMESTAMPTZ, 
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    avatar_url TEXT,
    is_online BOOLEAN,
    last_seen_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_member_of(_conversation_id) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        cp.user_id,
        cp.joined_at,
        cp.last_read_at,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.avatar_url,
        p.is_online,
        p.last_seen_at
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = _conversation_id;
END;
$$;


-- B. GET CHAT CONTACTS (FIXED AMBIGUITY with FULL PREFIXES)
CREATE OR REPLACE FUNCTION public.get_chat_contacts()
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,
    contact_first_name TEXT,
    contact_last_name TEXT,
    contact_role TEXT,
    contact_avatar_url TEXT
) AS $$
DECLARE
    v_current_role TEXT;
BEGIN
    SELECT p.role INTO v_current_role FROM profiles p WHERE p.id = auth.uid();
    
    IF v_current_role = 'patient' THEN
        RETURN QUERY
        SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.avatar_url
        FROM public.profiles p
        WHERE p.role != 'patient'
        AND p.is_active = true
        ORDER BY p.first_name ASC;
    ELSE
        RETURN QUERY
        SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.avatar_url
        FROM public.profiles p
        WHERE p.id != auth.uid()
        AND p.is_active = true
        ORDER BY 
            CASE WHEN p.role = 'patient' THEN 2 ELSE 1 END,
            p.first_name ASC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. AUTOMATION (Trigger)

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NOW(),
        last_message_preview = 
            CASE 
                WHEN NEW.type = 'image' THEN 'Sent an image'
                WHEN NEW.type = 'audio' THEN 'Sent a voice note'
                ELSE LEFT(NEW.content, 50)
            END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();
