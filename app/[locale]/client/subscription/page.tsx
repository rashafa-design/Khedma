import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpBox } from "@/components/help-box";
import { Link } from "@/i18n/navigation";
import { isActive, PLAN_ORDER } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  SubscriptionRow,
  UnlockRow,
  WorkerProfileRow,
  WorkType,
} from "@/lib/types";

export default async function ClientSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptionRows } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("client_id", user.id)
    .returns<SubscriptionRow[]>();

  // One active plan of each kind at most.
  const activeByPlan: Partial<Record<WorkType, SubscriptionRow>> = {};
  for (const s of subscriptionRows ?? []) {
    if (isActive(s) && !activeByPlan[s.plan]) activeByPlan[s.plan] = s;
  }
  const activePlans = PLAN_ORDER.filter((plan) => activeByPlan[plan]);

  if (activePlans.length === 0) {
    redirect("/client/subscribe");
  }

  const { data: unlocks } = await supabase
    .from("unlocks")
    .select("*")
    .in(
      "subscription_id",
      activePlans.map((plan) => activeByPlan[plan]!.id)
    )
    .returns<UnlockRow[]>();

  const t = await getTranslations("subscription");
  const tPlans = await getTranslations("plans");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Cairo",
    });

  const workerProfileIds = [
    ...new Set((unlocks ?? []).map((u) => u.worker_profile_id)),
  ];

  type UnlockedWorker = {
    workerProfile: WorkerProfileRow;
    fullName: string;
    professionName: string;
    phone: string | null;
  };
  const unlockedById = new Map<string, UnlockedWorker>();

  if (workerProfileIds.length > 0) {
    const { data: workerProfiles } = await supabase
      .from("worker_profiles")
      .select("*")
      .in("id", workerProfileIds)
      .returns<WorkerProfileRow[]>();

    const professionIds = [
      ...new Set((workerProfiles ?? []).map((w) => w.profession_id)),
    ];

    // profiles has no cross-user select policy (Phase 0, protects phone
    // numbers) - names come through get_worker_display_name instead,
    // same reasoning as the fix applied to the browse page.
    const [{ data: professions }, nameResults, phoneResults] =
      await Promise.all([
        supabase
          .from("professions")
          .select("*")
          .in("id", professionIds)
          .returns<ProfessionRow[]>(),
        Promise.all(
          (workerProfiles ?? []).map((w) =>
            supabase.rpc("get_worker_display_name", {
              p_worker_profile_id: w.id,
            })
          )
        ),
        Promise.all(
          (workerProfiles ?? []).map((w) =>
            supabase.rpc("get_worker_phone_number", {
              p_worker_profile_id: w.id,
            })
          )
        ),
      ]);

    (workerProfiles ?? []).forEach((workerProfile, index) => {
      unlockedById.set(workerProfile.id, {
        workerProfile,
        fullName: (nameResults[index]?.data as string | null) ?? "—",
        professionName:
          professions?.find((p) => p.id === workerProfile.profession_id)?.[
            nameKey
          ] ?? "",
        phone: (phoneResults[index]?.data as string | null) ?? null,
      });
    });
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <HelpBox topic="mySubscription" />

      {activePlans.map((plan) => {
        const subscription = activeByPlan[plan]!;
        const planUnlocks = (unlocks ?? []).filter(
          (u) => u.subscription_id === subscription.id
        );
        const used = planUnlocks.length;
        // Only workers whose kind of work fits this plan show a number.
        const visibleUnlocks = planUnlocks.filter((u) =>
          unlockedById
            .get(u.worker_profile_id)
            ?.workerProfile.work_types.includes(plan)
        );
        const hiddenCount = planUnlocks.length - visibleUnlocks.length;

        return (
          <section key={plan} className="flex flex-col gap-3">
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="font-semibold">
                {plan === "visits" ? "🔧 " : "📅 "}
                {tPlans(`${plan}Title`)}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t("expiresOn")} {formatDateTime(subscription.expires_at)} ·{" "}
                {used}/{subscription.slots_total} {t("slotsUsed")} ·{" "}
                {subscription.slots_total - used} {t("slotsRemaining")}
              </p>
            </div>

            {hiddenCount > 0 && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                {t("hiddenUnlocks", { count: hiddenCount })}
              </p>
            )}

            {visibleUnlocks.length === 0 ? (
              <p className="text-sm text-gray-600">{t("noneUnlockedYet")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleUnlocks.map((unlock) => {
                  const worker = unlockedById.get(unlock.worker_profile_id);
                  if (!worker) return null;
                  return (
                    <li
                      key={unlock.id}
                      className="rounded-md border border-gray-200 p-3 text-sm"
                    >
                      <p className="font-medium">
                        {worker.fullName} · {worker.professionName}
                      </p>
                      <p className="text-gray-600" dir="ltr">
                        {worker.phone ?? t("noPhone")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/browse"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          {t("browseMore")}
        </Link>
        {PLAN_ORDER.filter((plan) => !activeByPlan[plan]).map((plan) => (
          <Link
            key={plan}
            href={`/client/subscribe?plan=${plan}`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            {tPlans(plan === "visits" ? "getVisits" : "getMonthly")}
          </Link>
        ))}
      </div>
    </main>
  );
}
