import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  TaskTypeRow,
  WorkerProfileRow,
  WorkerTaskEntryRow,
} from "@/lib/types";
import { AvailabilityToggle } from "./availability-toggle";
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

  const [{ data: profession }, { data: taskTypes }, { data: taskEntries }] =
    await Promise.all([
      supabase
        .from("professions")
        .select("*")
        .eq("id", workerProfile.profession_id)
        .maybeSingle<ProfessionRow>(),
      supabase
        .from("task_types")
        .select("*")
        .eq("profession_id", workerProfile.profession_id)
        .eq("is_active", true)
        .order("created_at")
        .returns<TaskTypeRow[]>(),
      supabase
        .from("worker_task_entries")
        .select("*")
        .eq("worker_profile_id", workerProfile.id)
        .order("created_at")
        .returns<WorkerTaskEntryRow[]>(),
    ]);

  const t = await getTranslations("worker");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboardTitle")}</h1>
          <p className="text-sm text-gray-600">
            {profession?.[nameKey]} · {t("availability")}:{" "}
            {t(workerProfile.availability)}
          </p>
        </div>
        <AvailabilityToggle
          workerProfileId={workerProfile.id}
          availability={workerProfile.availability}
        />
      </div>

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
          nameKey={nameKey}
        />
      )}

      <DeleteProfileButton workerProfileId={workerProfile.id} />
    </main>
  );
}
