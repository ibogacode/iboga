-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    is_group BOOLEAN DEFAULT false,
    name TEXT -- Optional name for group chats
);

-- Create conversation items (participants) table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'file')),
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

--- RLS POLICIES ---

-- Conversations: Users can see conversations they are participants of
CREATE POLICY "Users can view their conversations"
    ON public.conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.conversations.id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert conversations" -- needed for creating new chats
    ON public.conversations
    FOR INSERT
    WITH CHECK (true); -- Logic handled by application/participant creation

-- Participants: Users can see participants of conversations they are providing they are also a participant
CREATE POLICY "Users can view participants of their conversations"
    ON public.conversation_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants as cp
            WHERE cp.conversation_id = public.conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add themselves or others to conversations"
    ON public.conversation_participants
    FOR INSERT
    WITH CHECK (true); -- Validation should ideally happen in a function or simpler check, but allowing insert for now.

-- Messages: Users can see messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their conversations"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = conversation_id
            AND user_id = auth.uid()
        )
    );

--- FUNCTIONS ---

-- Function to get available contacts for a user
-- Enforces: Patients see only Staff. Staff sees everyone.
CREATE OR REPLACE FUNCTION public.get_chat_contacts()
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    avatar_url TEXT
) AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Get current user role
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();

    IF v_role = 'patient' THEN
        -- Patients can only see non-patients (staff)
        RETURN QUERY
        SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.avatar_url
        FROM public.profiles p
        WHERE p.role != 'patient'
        AND p.is_active = true
        ORDER BY p.first_name ASC;
    ELSE
        -- Staff can see everyone
        RETURN QUERY
        SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.avatar_url
        FROM public.profiles p
        WHERE p.id != auth.uid() -- Exclude self
        AND p.is_active = true
        ORDER BY p.role DESC, p.first_name ASC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation's last_message_at
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();

-- Storage Bucket for Chat Attachments
-- (This part usually requires Supabase UI or API, but SQL can set up policies if bucket exists)
-- We'll try to insert into storage.buckets if permissions allow, otherwise user might need to create it manually.

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public access (or authenticated) to view
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-attachments' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'chat-attachments' AND
    auth.role() = 'authenticated'
);
