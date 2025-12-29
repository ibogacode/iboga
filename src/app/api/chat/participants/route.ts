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

  // Verify user belongs to this conversation
  const { data: membership, error: membershipError } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error('[participants API] membership check error:', {
      message: (membershipError as any)?.message,
      details: (membershipError as any)?.details,
      hint: (membershipError as any)?.hint,
      code: (membershipError as any)?.code,
      raw: membershipError,
    });
    return NextResponse.json({ error: membershipError }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all participants
  const { data: parts, error: partsError } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  console.log('[participants API] participants data:', parts);
  console.log('[participants API] participants error:', partsError);

  if (partsError) {
    console.error('[participants API] participants fetch error:', {
      message: (partsError as any)?.message,
      details: (partsError as any)?.details,
      hint: (partsError as any)?.hint,
      code: (partsError as any)?.code,
      raw: partsError,
    });
    return NextResponse.json({ error: partsError }, { status: 500 });
  }

  const userIds = (parts ?? []).map(p => p.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    console.error('[participants API] profiles fetch error:', {
      message: (profilesError as any)?.message,
      details: (profilesError as any)?.details,
      hint: (profilesError as any)?.hint,
      code: (profilesError as any)?.code,
      raw: profilesError,
    });
    return NextResponse.json({ error: profilesError }, { status: 500 });
  }

  return NextResponse.json({ profiles: profiles ?? [] });
}

