import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Forgets this phone/browser. Row-level security means a user can only ever
// remove their own subscriptions.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
  } | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
