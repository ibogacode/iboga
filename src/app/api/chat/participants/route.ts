import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify membership and fetch participants in one secure RPC call
  // This bypasses the recursion issues of querying conversation_participants directly
  const { data: participants, error: rpcError } = await supabase
    .rpc('get_conversation_members', {
      _conversation_id: conversationId
    });

  if (rpcError) {
    console.error('[participants API] RPC error:', {
      message: (rpcError as any)?.message,
      details: (rpcError as any)?.details,
      code: (rpcError as any)?.code,
      raw: rpcError,
    });
    // Fallback or specific error handling can be improved here
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  // The RPC returns the full profile data joined, so we map it to match the expected format
  const profiles = (participants || []).map((p: any) => ({
    id: p.user_id,
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    avatar_url: p.avatar_url,
    is_online: p.is_online,
    last_seen_at: p.last_seen_at
  }));

  return NextResponse.json({ profiles });
}

