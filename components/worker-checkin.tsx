import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AVAILABILITY_EVERY_DAYS,
  AVAILABILITY_HIDE_DAYS,
  availabilityState,
  checkinState,
  CONFIRM_EVERY_DAYS,
  daysSince,
  GRACE_DAYS,
} from "@/lib/checkin";
import { createClient } from "@/lib/supabase/server";
import type { WorkerProfileRow } from "@/lib/types";
import { CheckinButtons } from "./checkin-buttons";

type CheckinWorker = Pick<
  WorkerProfileRow,
  | "id"
  | "status"
  | "last_confirmed_at"
  | "availability"
  | "availability_confirmed_at"
>;

// The prompts a worker sees on their dashboard, most important first:
//  1. clients reported a problem / the 3-monthly details check-in
//  2. the quick 2-weekly "still available?" renewal
//  3. "an admin is reviewing your listing" when they are hidden for repeated
//     bad experiences (nothing the worker can tap to fix)
// Renders nothing when everything is up to date.
export async function WorkerCheckin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: worker } = await supabase
    .from("worker_profiles")
    .select("id, status, last_confirmed_at, availability, availability_confirmed_at")
    .eq("user_id", user.id)
    .maybeSingle<CheckinWorker>();

  // Only approved listings are visible to clients, so only those need this.
  if (!worker || worker.status !== "approved") return null;

  const [{ data: reportCount }, { data: isHidden }, { data: slowRows }] =
    await Promise.all([
      supabase.rpc("get_worker_open_report_count", {
        p_worker_profile_id: worker.id,
      }),
      supabase.rpc("get_worker_is_hidden", { p_worker_profile_id: worker.id }),
      supabase.rpc("get_unresponsive_worker_ids"),
    ]);
  const reports = (reportCount as number | null) ?? 0;
  // Missed a client's question recently: shown lower in the list until they
  // answer or confirm they are still available.
  const missedRequest = ((slowRows as string[] | null) ?? []).includes(
    worker.id
  );
  const detailsState = checkinState(worker.last_confirmed_at);
  const availState =
    worker.availability === "available"
      ? availabilityState(worker.availability_confirmed_at)
      : "ok";

  const t = await getTranslations("checkin");

  const listingLink = (
    <p className="mt-1">
      {t("checkList")}{" "}
      <Link href="/worker/dashboard" className="font-medium underline">
        {t("openListing")}
      </Link>
    </p>
  );

  // 1. Reports / 3-monthly details.
  if (reports > 0 || detailsState !== "ok") {
    const days = daysSince(worker.last_confirmed_at);
    const hidden = detailsState === "hidden" || reports >= 2;
    const urgent = hidden || detailsState === "overdue" || reports > 0;

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
              : detailsState === "overdue"
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
              : detailsState === "overdue"
                ? t("overdueBody", {
                    days: Math.max(CONFIRM_EVERY_DAYS + GRACE_DAYS - days, 0),
                  })
                : t("dueBody", { days: Math.max(CONFIRM_EVERY_DAYS - days, 0) })}
        </p>
        {listingLink}
        <CheckinButtons kind="details" />
      </section>
    );
  }

  // 1b. A client's question expired unanswered.
  if (missedRequest) {
    return (
      <section className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-semibold">{t("missedTitle")}</h2>
        <p className="mt-1">{t("missedBody")}</p>
        <CheckinButtons kind="availability" />
      </section>
    );
  }

  // 2. Quick 2-weekly availability renewal.
  if (availState !== "ok") {
    const days = daysSince(worker.availability_confirmed_at);
    const hidden = availState === "hidden";
    const urgent = hidden || availState === "overdue";

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
            ? t("availHiddenTitle")
            : availState === "overdue"
              ? t("availOverdueTitle")
              : t("availDueTitle")}
        </h2>
        <p className="mt-1">
          {hidden
            ? t("availHiddenBody")
            : availState === "overdue"
              ? t("availOverdueBody", {
                  days: Math.max(AVAILABILITY_HIDE_DAYS - days, 0),
                })
              : t("availDueBody", {
                  days: Math.max(AVAILABILITY_EVERY_DAYS - days, 0),
                })}
        </p>
        <CheckinButtons kind="availability" />
      </section>
    );
  }

  // 3. Hidden for repeated bad experiences - an admin has to look at it.
  if (isHidden) {
    return (
      <section className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-950">
        <h2 className="font-semibold">{t("flaggedTitle")}</h2>
        <p className="mt-1">{t("flaggedBody")}</p>
      </section>
    );
  }

  return null;
}
