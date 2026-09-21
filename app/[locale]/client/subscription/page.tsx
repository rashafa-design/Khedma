import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  SubscriptionRow,
  UnlockRow,
  WorkerProfileRow,
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

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (!subscription || new Date(subscription.expires_at) <= new Date()) {
    redirect("/client/subscribe");
  }

  const { data: unlocks } = await supabase
    .from("unlocks")
    .select("*")
    .eq("subscription_id", subscription.id)
    .returns<UnlockRow[]>();

  const t = await getTranslations("subscription");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";
  const slotsUsed = unlocks?.length ?? 0;

  const workerProfileIds =
    unlocks && unlocks.length > 0
      ? unlocks.map((u) => u.worker_profile_id)
      : [];

  let unlockedWorkers: {
    workerProfile: WorkerProfileRow;
    fullName: string;
    professionName: string;
    phone: string | null;
  }[] = [];

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

    unlockedWorkers = (workerProfiles ?? []).map((workerProfile, index) => ({
      workerProfile,
      fullName: (nameResults[index]?.data as string | null) ?? "—",
      professionName:
        professions?.find((p) => p.id === workerProfile.profession_id)?.[
          nameKey
        ] ?? "",
      phone: (phoneResults[index]?.data as string | null) ?? null,
    }));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("expiresOn")}{" "}
          {new Date(subscription.expires_at).toLocaleDateString(locale)} ·{" "}
          {slotsUsed}/{subscription.slots_total} {t("slotsUsed")} ·{" "}
          {subscription.slots_total - slotsUsed} {t("slotsRemaining")}
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">{t("unlockedWorkers")}</h2>
        {unlockedWorkers.length === 0 ? (
          <p className="text-sm text-gray-600">{t("noneUnlockedYet")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unlockedWorkers.map(({ workerProfile, fullName, professionName, phone }) => (
              <li
                key={workerProfile.id}
                className="rounded-md border border-gray-200 p-3 text-sm"
              >
                <p className="font-medium">
                  {fullName} · {professionName}
                </p>
                <p className="text-gray-600" dir="ltr">
                  {phone ?? t("noPhone")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/browse"
        className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        {t("browseMore")}
      </Link>
    </main>
  );
}
