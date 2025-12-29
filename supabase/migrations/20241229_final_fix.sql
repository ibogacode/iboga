-- FINAL FIX V5: Security Hardening & RLS Bypass
-- Includes Atomic Creation (Bypasses RLS), Safe Policies, Deletion RPC, and Blocked Direct Inserts.

-- 1. CLEANUP
DROP POLICY IF EXISTS "Profiles visibility" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Conversations are viewable by participants" ON conversations;
DROP POLICY IF EXISTS "Conversations view" ON conversations;
DROP POLICY IF EXISTS "Conversations insert" ON conversations;
DROP POLICY IF EXISTS "Conversations update" ON conversations;
DROP POLICY IF EXISTS "Conversations insert (no direct inserts)" ON conversations;

DROP POLICY IF EXISTS "Participants are viewable by conversation members" ON conversation_participants;
DROP POLICY IF EXISTS "Participants view self only" ON conversation_participants;
DROP POLICY IF EXISTS "Participants view members in my conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Participants insert" ON conversation_participants;
DROP POLICY IF EXISTS "Participants delete" ON conversation_participants;
DROP POLICY IF EXISTS "Participants update" ON conversation_participants;
DROP POLICY IF EXISTS "Participants update own" ON conversation_participants;
DROP POLICY IF EXISTS "Participants insert (no direct inserts)" ON conversation_participants;

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
DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID);
DROP FUNCTION IF EXISTS public.create_conversation_with_participants(UUID);
DROP FUNCTION IF EXISTS public.delete_conversation(UUID);

-- 2. HELPER FUNCTIONS

-- is_member_of: SECURITY DEFINER (Bypass RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_member_of(_conversation_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of(UUID) TO authenticated;


-- 3. STRICT RLS POLICIES

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

-- STRICT: No direct inserts. Must use create_conversation_with_participants RPC.
CREATE POLICY "Conversations insert (no direct inserts)"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Conversations update"
ON conversations FOR UPDATE
TO authenticated
USING (is_member_of(id));


-- PARTICIPANTS
-- STRICT POLICY: View Self Only.
CREATE POLICY "Participants view self only"
ON conversation_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- STRICT: No direct inserts. Must use create_conversation_with_participants RPC.
CREATE POLICY "Participants insert (no direct inserts)"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Participants delete"
ON conversation_participants FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Participants update own"
ON conversation_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- MESSAGES
CREATE POLICY "Messages view"
ON messages FOR SELECT
TO authenticated
USING (is_member_of(conversation_id));

-- STRICT: Check membership AND enforce sender identity to prevent spoofing
CREATE POLICY "Messages insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  is_member_of(conversation_id)
  AND sender_id = auth.uid()
);

-- STRICT: Check identity on update
CREATE POLICY "Messages update"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());


-- 4. PRIVILEGED ACCESS FUNCTIONS

-- A. CREATE CONVERSATION ATOMIC (Bypassing RLS for inserts)
CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, auth.uid()),
    (v_conversation_id, p_other_user_id);

  RETURN v_conversation_id;
END;
$$;


-- B. GET CONVERSATION MEMBERS (Bypassing RLS for visibility)
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
SET row_security = off
AS $$
BEGIN
    -- Manual security check since RLS is off
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = _conversation_id AND user_id = auth.uid()
    ) THEN
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


-- C. GET CHAT CONTACTS
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


-- D. MARK MESSAGES AS READ (Bypassing RLS for updates)
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    -- Manual security check since RLS is off
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.messages
    SET read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;

    UPDATE public.conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;


-- E. DELETE CONVERSATION (Cascading Delete via RPC, Bypassing RLS)
CREATE OR REPLACE FUNCTION public.delete_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    -- Manual security check since RLS is off
    IF NOT EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

  -- 1) Nullify reply_to first (to prevent self-referential FK blocking)
  UPDATE public.messages
  SET reply_to = NULL
  WHERE conversation_id = p_conversation_id;

  -- 2) Delete messages (FK blocks conversation delete otherwise)
  DELETE FROM public.messages
  WHERE conversation_id = p_conversation_id;

  -- 3) Delete participants
  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id;

  -- 4) Delete conversation
  DELETE FROM public.conversations
  WHERE id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation(uuid) TO authenticated;


-- 5. AUTOMATION (Trigger)

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
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
$$;

CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();


-- F. GET User Conversations (Consolidated RPC)
CREATE OR REPLACE FUNCTION public.get_user_conversations(
    p_user_id uuid,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    last_message_at timestamptz,
    last_message_preview text,
    is_group boolean,
    name text,
    unread_count bigint,
    participants jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    -- Ensure p_user_id matches authenticated user
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
         -- Optional: allow if admin, but strict is safer
         RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    WITH user_convs AS (
        SELECT cp.conversation_id
        FROM conversation_participants cp
        WHERE cp.user_id = p_user_id
    )
    SELECT
        c.id,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        c.last_message_preview,
        c.is_group,
        c.name,
        (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id != p_user_id
              AND m.read_at IS NULL
        ) AS unread_count,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_id', p.id,
                    'email', p.email,
                    'first_name', p.first_name,
                    'last_name', p.last_name,
                    'role', p.role,
                    'avatar_url', p.avatar_url,
                    'is_online', p.is_online,
                    'last_seen_at', p.last_seen_at,
                    'joined_at', cp2.joined_at,
                    'last_read_at', cp2.last_read_at,
                    'user', jsonb_build_object( -- nested user object for frontend compat
                        'id', p.id,
                        'email', p.email,
                        'first_name', p.first_name,
                        'last_name', p.last_name,
                        'role', p.role,
                        'avatar_url', p.avatar_url,
                        'is_online', p.is_online,
                        'last_seen_at', p.last_seen_at
                    )
                )
            )
            FROM conversation_participants cp2
            JOIN profiles p ON p.id = cp2.user_id
            WHERE cp2.conversation_id = c.id
        ) AS participants
    FROM conversations c
    JOIN user_convs uc ON uc.conversation_id = c.id
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid, integer, integer) TO authenticated;

-- 6. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_chat_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_with_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid, integer, integer) TO authenticated;
