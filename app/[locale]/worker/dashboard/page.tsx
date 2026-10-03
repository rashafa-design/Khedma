import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  ProfileRow,
  TaskTypeRow,
  WorkerProfessionRow,
  WorkerProfileRow,
  WorkerServiceAreaRow,
  WorkerTaskEntryRow,
} from "@/lib/types";
import { HelpBox } from "@/components/help-box";
import { PushToggle } from "@/components/push-toggle";
import { WorkerCheckin } from "@/components/worker-checkin";
import { WorkerRequests } from "@/components/worker-requests";
import { LocationForm } from "./location-form";
import { ProfessionsForm } from "./professions-form";
import { WorkTypeForm } from "./work-type-form";
import { AvailabilityToggle } from "./availability-toggle";
import { ContactPhoneForm } from "./contact-phone-form";
import { DeleteProfileButton } from "./delete-profile-button";
import { TaskEntryForm } from "./task-entry-form";
import { TaskEntryList } from "./task-entry-list";

export default async function WorkerDashboardPage({
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

  const { data: workerProfile } = await supabase
    .from("worker_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<WorkerProfileRow>();

  if (!workerProfile || workerProfile.status !== "approved") {
    redirect("/worker/onboarding");
  }

  const { data: heldRows } = await supabase
    .from("worker_professions")
    .select("*")
    .eq("worker_profile_id", workerProfile.id)
    .returns<WorkerProfessionRow[]>();
  const heldIds = (heldRows ?? []).map((r) => r.profession_id);
  if (!heldIds.includes(workerProfile.profession_id)) {
    heldIds.push(workerProfile.profession_id);
  }

  // Neighborhood names other workers already used, offered as suggestions.
  const { data: neighborhoodRows } = await supabase
    .from("worker_profiles")
    .select("service_neighborhoods")
    .eq("status", "approved")
    .returns<{ service_neighborhoods: string[] }[]>();
  const neighborhoodSuggestions = [
    ...new Set((neighborhoodRows ?? []).flatMap((r) => r.service_neighborhoods)),
  ].sort();

  const [
    { data: allProfessions },
    { data: taskTypes },
    { data: taskEntries },
    { data: profile },
    { data: areaRows },
  ] = await Promise.all([
      supabase
        .from("professions")
        .select("*")
        .order("created_at")
        .returns<ProfessionRow[]>(),
      supabase
        .from("task_types")
        .select("*")
        .in("profession_id", heldIds)
        .eq("is_active", true)
        .order("created_at")
        .returns<TaskTypeRow[]>(),
      supabase
        .from("worker_task_entries")
        .select("*")
        .eq("worker_profile_id", workerProfile.id)
        .order("created_at")
        .returns<WorkerTaskEntryRow[]>(),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("worker_service_areas")
        .select("*")
        .eq("worker_profile_id", workerProfile.id)
        .returns<WorkerServiceAreaRow[]>(),
    ]);

  const t = await getTranslations("worker");
  const tLocation = await getTranslations("location");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";
  const serviceAreas = (areaRows ?? []).map((a) => a.governorate);
  const professionList = allProfessions ?? [];
  const heldProfessions = professionList.filter((p) => heldIds.includes(p.id));
  const availableProfessions = professionList.filter(
    (p) => p.is_active && !heldIds.includes(p.id)
  );
  const mainProfession = professionList.find(
    (p) => p.id === workerProfile.profession_id
  );
  const taskTypeIdsByProfession: Record<string, string[]> = {};
  for (const taskType of taskTypes ?? []) {
    (taskTypeIdsByProfession[taskType.profession_id] ??= []).push(taskType.id);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboardTitle")}</h1>
          <p className="text-sm text-gray-600">
            {heldProfessions.map((p) => p[nameKey]).join(" · ")} ·{" "}
            {t("availability")}:{" "}
            {t(workerProfile.availability)}
          </p>
        </div>
        <AvailabilityToggle
          workerProfileId={workerProfile.id}
          availability={workerProfile.availability}
        />
      </div>

      <WorkerRequests />
      <WorkerCheckin />
      <PushToggle audience="worker" />

      {serviceAreas.length === 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{tLocation("missingTitle")}</p>
          <p className="mt-1">{tLocation("missingBody")}</p>
        </div>
      )}

      {workerProfile.work_types.includes("visits") &&
        workerProfile.service_neighborhoods.length === 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">{tLocation("noNeighborhoodsTitle")}</p>
            <p className="mt-1">{tLocation("noNeighborhoodsBody")}</p>
          </div>
        )}

      <HelpBox topic="workerListing" />

      <ProfessionsForm
        workerProfileId={workerProfile.id}
        mainProfessionId={mainProfession?.id ?? workerProfile.profession_id}
        held={heldProfessions}
        available={availableProfessions}
        taskTypeIdsByProfession={taskTypeIdsByProfession}
        nameKey={nameKey}
      />

      <WorkTypeForm
        workerProfileId={workerProfile.id}
        workTypes={workerProfile.work_types}
      />

      <LocationForm
        workerProfileId={workerProfile.id}
        baseGovernorate={workerProfile.base_governorate}
        serviceAreas={serviceAreas}
        neighborhoods={workerProfile.service_neighborhoods}
        worksByVisits={workerProfile.work_types.includes("visits")}
        suggestions={neighborhoodSuggestions}
      />

      <div>
        <h2 className="mb-3 font-semibold">{t("yourTasks")}</h2>
        <TaskEntryList
          entries={taskEntries ?? []}
          taskTypes={taskTypes ?? []}
          nameKey={nameKey}
        />
      </div>

      {(taskTypes ?? []).length === 0 ? (
        <p className="text-sm text-gray-600">{t("noTaskTypesForProfession")}</p>
      ) : (
        <TaskEntryForm
          workerProfileId={workerProfile.id}
          taskTypes={taskTypes ?? []}
          professions={heldProfessions}
          nameKey={nameKey}
        />
      )}

      <ContactPhoneForm
        userId={user.id}
        phoneNumber={profile?.phone_number ?? null}
      />

      <DeleteProfileButton workerProfileId={workerProfile.id} />
    </main>
  );
}
