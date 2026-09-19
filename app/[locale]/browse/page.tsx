import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  ProfileRow,
  TaskTypeRow,
  WorkerProfileRow,
  WorkerTaskEntryRow,
} from "@/lib/types";
import { BrowseControls } from "./browse-controls";
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

  const userIds =
    workerList.length > 0 ? workerList.map((w) => w.user_id) : [NIL_UUID];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds)
    .returns<ProfileRow[]>();

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
          const profile = profiles?.find((p) => p.id === worker.user_id);
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
              fullName={profile?.full_name ?? ""}
              photoUrl={photoUrl}
              profession={profession}
              nationality={worker.nationality}
              yearsExperience={worker.years_experience}
              availability={worker.availability}
              taskEntries={entries}
              taskTypes={taskTypes ?? []}
              nameKey={nameKey}
            />
          );
        })}
      </div>
    </main>
  );
}
