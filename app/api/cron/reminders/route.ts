import { NextResponse } from "next/server";
import { daysSince } from "@/lib/checkin";
import { getPreferredLocale, sendPush } from "@/lib/push";
import { pushLocale, pushText } from "@/lib/push-messages";
import { createServiceClient } from "@/lib/supabase/service";

// Runs once a day (see vercel.json). Vercel calls it with the CRON_SECRET, so
// nobody else can trigger it. Nudges workers on the days their check-ins are
// coming due, getting more urgent as the hide date approaches.
const AVAILABILITY_REMIND_DAYS = [10, 14, 21, 27];
const DETAILS_REMIND_DAYS = [76, 90, 97, 103];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: workers } = await service
    .from("worker_profiles")
    .select("user_id, availability, availability_confirmed_at, last_confirmed_at")
    .eq("status", "approved")
    .returns<
      {
        user_id: string;
        availability: string;
        availability_confirmed_at: string;
        last_confirmed_at: string;
      }[]
    >();

  let notified = 0;
  for (const worker of workers ?? []) {
    const availabilityDays = daysSince(worker.availability_confirmed_at);
    const detailsDays = daysSince(worker.last_confirmed_at);

    const kind = DETAILS_REMIND_DAYS.includes(detailsDays)
      ? "detailsDue"
      : worker.availability === "available" &&
          AVAILABILITY_REMIND_DAYS.includes(availabilityDays)
        ? "availDue"
        : null;
    if (!kind) continue;

    const locale = pushLocale(await getPreferredLocale(worker.user_id));
    const sent = await sendPush(worker.user_id, {
      ...pushText(kind, locale),
      url: `/${locale}/dashboard`,
    });
    if (sent > 0) notified += 1;
  }

  return NextResponse.json({ workers: workers?.length ?? 0, notified });
}
