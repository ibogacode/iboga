
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { isOnline } = body;

        if (typeof isOnline !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Call RPC to update status
        const { error } = await supabase.rpc('update_online_status', {
            p_is_online: isOnline
        });

        if (error) {
            console.error('Error updating status:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Unexpected error in status route:', err);
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
