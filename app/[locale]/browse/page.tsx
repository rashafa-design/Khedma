import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  SubscriptionRow,
  TaskTypeRow,
  UnlockRow,
  WorkerProfileRow,
  WorkerTaskEntryRow,
} from "@/lib/types";
import { BrowseControls } from "./browse-controls";
import type { ContactState } from "./worker-card";
import { WorkerCard } from "./worker-card";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const professionFilter = typeof sp.profession === "string" ? sp.profession : "";
  const scopeFilter = typeof sp.scope === "string" ? sp.scope : "";
  const nationalityFilter =
    typeof sp.nationality === "string" ? sp.nationality : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  let workerQuery = supabase
    .from("worker_profiles")
    .select("*")
    .eq("status", "approved");

  if (professionFilter) {
    workerQuery = workerQuery.eq("profession_id", professionFilter);
  }
  if (nationalityFilter) {
    workerQuery = workerQuery.eq("nationality", nationalityFilter);
  }

  const { data: workers } = await workerQuery.returns<WorkerProfileRow[]>();
  let workerList = workers ?? [];

  const t = await getTranslations("browse");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";

  const [{ data: professions }, { data: taskTypes }, { data: allApproved }] =
    await Promise.all([
      supabase
        .from("professions")
        .select("*")
        .eq("is_active", true)
        .returns<ProfessionRow[]>(),
      supabase.from("task_types").select("*").returns<TaskTypeRow[]>(),
      supabase.from("worker_profiles").select("nationality").eq("status", "approved"),
    ]);

  const nationalities = [
    ...new Set((allApproved ?? []).map((w) => w.nationality)),
  ].sort();

  const workerIds = workerList.length > 0 ? workerList.map((w) => w.id) : [NIL_UUID];
  const { data: taskEntries } = await supabase
    .from("worker_task_entries")
    .select("*")
    .in("worker_profile_id", workerIds)
    .returns<WorkerTaskEntryRow[]>();

  if (scopeFilter === "home" || scopeFilter === "business") {
    const matchingWorkerIds = new Set(
      (taskEntries ?? [])
        .filter(
          (entry) => entry.scope === scopeFilter || entry.scope === "both"
        )
        .map((entry) => entry.worker_profile_id)
    );
    workerList = workerList.filter((w) => matchingWorkerIds.has(w.id));
  }

  // profiles has no cross-user select policy (Phase 0, protects phone
  // numbers) - a worker's display name is meant to be public once
  // approved, so it's read through this RPC instead of the table directly.
  const nameResults = await Promise.all(
    workerList.map(async (worker) => {
      const { data } = await supabase.rpc("get_worker_display_name", {
        p_worker_profile_id: worker.id,
      });
      return [worker.id, (data as string | null) ?? ""] as const;
    })
  );
  const nameByWorkerId = new Map(nameResults);

  // Build a contact state (unlocked / can unlock / out of slots / needs a
  // subscription) per worker - only meaningful for clients. Workers and
  // admins browsing just see the listing with no unlock mechanic at all.
  const contactByWorkerId = new Map<string, ContactState>();

  if (profile?.role === "client") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    const hasActiveSubscription =
      !!subscription && new Date(subscription.expires_at) > new Date();

    let unlockedWorkerIds = new Set<string>();
    let phoneByWorkerId = new Map<string, string | null>();
    let slotsUsed = 0;

    if (hasActiveSubscription && subscription) {
      const { data: unlocks } = await supabase
        .from("unlocks")
        .select("*")
        .eq("subscription_id", subscription.id)
        .returns<UnlockRow[]>();

      slotsUsed = unlocks?.length ?? 0;
      unlockedWorkerIds = new Set((unlocks ?? []).map((u) => u.worker_profile_id));

      const phoneResults = await Promise.all(
        [...unlockedWorkerIds].map(async (workerProfileId) => {
          const { data } = await supabase.rpc("get_worker_phone_number", {
            p_worker_profile_id: workerProfileId,
          });
          return [workerProfileId, (data as string | null) ?? null] as const;
        })
      );
      phoneByWorkerId = new Map(phoneResults);
    }

    for (const worker of workerList) {
      if (unlockedWorkerIds.has(worker.id)) {
        contactByWorkerId.set(worker.id, {
          type: "unlocked",
          phone: phoneByWorkerId.get(worker.id) ?? null,
        });
      } else if (!hasActiveSubscription || !subscription) {
        contactByWorkerId.set(worker.id, { type: "subscribe" });
      } else if (slotsUsed >= subscription.slots_total) {
        contactByWorkerId.set(worker.id, { type: "no_slots" });
      } else {
        contactByWorkerId.set(worker.id, {
          type: "can_unlock",
          subscriptionId: subscription.id,
        });
      }
    }
  } else {
    for (const worker of workerList) {
      contactByWorkerId.set(worker.id, { type: "hidden" });
    }
  }

  function minPrice(workerId: string) {
    const entries = (taskEntries ?? []).filter(
      (e) => e.worker_profile_id === workerId
    );
    if (entries.length === 0) return Infinity;
    return Math.min(...entries.map((e) => e.price));
  }

  const sorted = [...workerList].sort((a, b) => {
    if (sort === "price") {
      return minPrice(a.id) - minPrice(b.id);
    }
    if (sort === "experience") {
      return b.years_experience - a.years_experience;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <BrowseControls
        professions={professions ?? []}
        nationalities={nationalities}
        nameKey={nameKey}
      />

      <div className="flex flex-col gap-4">
        {sorted.length === 0 && (
          <p className="text-sm text-gray-600">{t("empty")}</p>
        )}

        {sorted.map((worker) => {
          const profession = professions?.find(
            (p) => p.id === worker.profession_id
          );
          const entries = (taskEntries ?? []).filter(
            (e) => e.worker_profile_id === worker.id
          );
          const photoUrl = worker.photo_path
            ? supabase.storage
                .from("worker-photos")
                .getPublicUrl(worker.photo_path).data.publicUrl
            : null;

          return (
            <WorkerCard
              key={worker.id}
              workerProfileId={worker.id}
              fullName={nameByWorkerId.get(worker.id) ?? ""}
              photoUrl={photoUrl}
              profession={profession}
              nationality={worker.nationality}
              yearsExperience={worker.years_experience}
              availability={worker.availability}
              taskEntries={entries}
              taskTypes={taskTypes ?? []}
              nameKey={nameKey}
              contact={contactByWorkerId.get(worker.id) ?? { type: "hidden" }}
            />
          );
        })}
      </div>
    </main>
  );
}
