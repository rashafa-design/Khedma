import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { checkinState, CONFIRM_EVERY_DAYS, daysSince, GRACE_DAYS } from "@/lib/checkin";
import { createClient } from "@/lib/supabase/server";
import type { WorkerProfileRow } from "@/lib/types";
import { CheckinButtons } from "./checkin-buttons";

// The "please confirm your details" prompt a worker sees on their dashboard.
// Shows when the 3-monthly check-in is near or overdue, or when clients have
// reported a problem; renders nothing otherwise.
export async function WorkerCheckin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: worker } = await supabase
    .from("worker_profiles")
    .select("id, status, last_confirmed_at")
    .eq("user_id", user.id)
    .maybeSingle<Pick<WorkerProfileRow, "id" | "status" | "last_confirmed_at">>();

  // Only approved listings are visible to clients, so only those need this.
  if (!worker || worker.status !== "approved") return null;

  const { data: reportCount } = await supabase.rpc(
    "get_worker_open_report_count",
    { p_worker_profile_id: worker.id }
  );
  const reports = (reportCount as number | null) ?? 0;
  const state = checkinState(worker.last_confirmed_at);

  if (state === "ok" && reports === 0) return null;

  const t = await getTranslations("checkin");
  const days = daysSince(worker.last_confirmed_at);
  const daysLeft = CONFIRM_EVERY_DAYS - days;
  const hideInDays = CONFIRM_EVERY_DAYS + GRACE_DAYS - days;
  const hidden = state === "hidden" || reports >= 2;
  const urgent = hidden || state === "overdue" || reports > 0;

  return (
    <section
      className={`rounded-md border p-4 text-sm ${
        urgent
          ? "border-red-300 bg-red-50 text-red-950"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      <h2 className="font-semibold">
        {hidden
          ? t("hiddenTitle")
          : reports > 0
            ? t("reportedTitle")
            : state === "overdue"
              ? t("overdueTitle")
              : t("dueTitle")}
      </h2>
      <p className="mt-1">
        {hidden
          ? reports >= 2
            ? t("hiddenReportedBody")
            : t("hiddenBody")
          : reports > 0
            ? t("reportedBody")
            : state === "overdue"
              ? t("overdueBody", { days: Math.max(hideInDays, 0) })
              : t("dueBody", { days: Math.max(daysLeft, 0) })}
      </p>
      <p className="mt-1">
        {t("checkList")}{" "}
        <Link href="/worker/dashboard" className="font-medium underline">
          {t("openListing")}
        </Link>
      </p>
      <CheckinButtons />
    </section>
  );
}
