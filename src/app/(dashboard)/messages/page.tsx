import { createClient } from '@/lib/supabase/server';
import { MessagesClient } from './messages-client';

export default async function MessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    return <MessagesClient user={user} />;
}
