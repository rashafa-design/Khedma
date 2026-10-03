import { NextResponse } from "next/server";
import { getPreferredLocale, sendPush } from "@/lib/push";
import { pushAnswerText, pushLocale } from "@/lib/push-messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Called by the worker's browser right after they answer a client's "are you
// available?" question. Tells the client's phone the answer.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    requestId?: string;
  } | null;
  if (!body?.requestId) {
    return NextResponse.json({ error: "Missing request" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: availabilityRequest } = await service
    .from("availability_requests")
    .select("id, client_id, worker_profile_id, status, answer_push_sent_at")
    .eq("id", body.requestId)
    .maybeSingle<{
      id: string;
      client_id: string;
      worker_profile_id: string;
      status: string;
      answer_push_sent_at: string | null;
    }>();

  if (!availabilityRequest || availabilityRequest.status === "pending") {
    return NextResponse.json({ error: "Not answered" }, { status: 404 });
  }

  // Only the worker the question was about may trigger this.
  const { data: worker } = await service
    .from("worker_profiles")
    .select("user_id")
    .eq("id", availabilityRequest.worker_profile_id)
    .maybeSingle<{ user_id: string }>();
  if (!worker || worker.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (availabilityRequest.answer_push_sent_at) {
    return NextResponse.json({ sent: 0 });
  }
  await service
    .from("availability_requests")
    .update({ answer_push_sent_at: new Date().toISOString() })
    .eq("id", availabilityRequest.id);

  const { data: name } = await service.rpc("get_worker_display_name", {
    p_worker_profile_id: availabilityRequest.worker_profile_id,
  });

  const locale = pushLocale(
    await getPreferredLocale(availabilityRequest.client_id)
  );
  const text = pushAnswerText(
    availabilityRequest.status === "available",
    (name as string | null) ?? "",
    locale
  );
  const sent = await sendPush(availabilityRequest.client_id, {
    ...text,
    url: `/${locale}/browse`,
  });

  return NextResponse.json({ sent });
}
