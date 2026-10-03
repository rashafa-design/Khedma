import { NextResponse } from "next/server";
import { getPreferredLocale, sendPush } from "@/lib/push";
import { pushLocale, pushText } from "@/lib/push-messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Called by the client's browser right after they ask a worker "are you
// available?". Tells the worker's phone. Safe to call repeatedly: it only
// sends if the caller really has an open request for that worker, and only
// once per request.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    workerProfileId?: string;
  } | null;
  if (!body?.workerProfileId) {
    return NextResponse.json({ error: "Missing worker" }, { status: 400 });
  }

  // Read with the caller's own session: row-level security only shows a
  // client their own requests, so this proves the request is theirs.
  const { data: availabilityRequest } = await supabase
    .from("availability_requests")
    .select("id, push_sent_at")
    .eq("worker_profile_id", body.workerProfileId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; push_sent_at: string | null }>();

  if (!availabilityRequest) {
    return NextResponse.json({ error: "No open request" }, { status: 404 });
  }
  if (availabilityRequest.push_sent_at) {
    return NextResponse.json({ sent: 0 });
  }

  const service = createServiceClient();
  await service
    .from("availability_requests")
    .update({ push_sent_at: new Date().toISOString() })
    .eq("id", availabilityRequest.id);

  const { data: worker } = await service
    .from("worker_profiles")
    .select("user_id")
    .eq("id", body.workerProfileId)
    .maybeSingle<{ user_id: string }>();
  if (!worker) {
    return NextResponse.json({ sent: 0 });
  }

  const locale = pushLocale(await getPreferredLocale(worker.user_id));
  const text = pushText("request", locale);
  const sent = await sendPush(worker.user_id, {
    ...text,
    url: `/${locale}/dashboard`,
  });

  return NextResponse.json({ sent });
}
