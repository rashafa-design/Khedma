import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpBox } from "@/components/help-box";
import { governorateLabel } from "@/lib/governorates";
import { nationalityLabel } from "@/lib/nationalities";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  ProfileRow,
  WorkerProfileRow,
  WorkerServiceAreaRow,
} from "@/lib/types";
import { ReviewActions } from "./review-actions";

export default async function AdminPendingWorkersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: pendingWorkers } = await supabase
    .from("worker_profiles")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at")
    .returns<WorkerProfileRow[]>();

  const t = await getTranslations("adminReview");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";

  if (!pendingWorkers || pendingWorkers.length === 0) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-gray-600">{t("empty")}</p>
      </main>
    );
  }

  const userIds = pendingWorkers.map((worker) => worker.user_id);
  const professionIds = [
    ...new Set(pendingWorkers.map((worker) => worker.profession_id)),
  ];

  const [{ data: profiles }, { data: professions }, { data: areaRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .in("id", userIds)
      .returns<ProfileRow[]>(),
    supabase
      .from("professions")
      .select("*")
      .in("id", professionIds)
      .returns<ProfessionRow[]>(),
    supabase
      .from("worker_service_areas")
      .select("*")
      .in("worker_profile_id", pendingWorkers.map((w) => w.id))
      .returns<WorkerServiceAreaRow[]>(),
  ]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <HelpBox topic="adminWorkers" />

      <div className="flex flex-col gap-4">
        {pendingWorkers.map((worker) => {
          const profile = profiles?.find((p) => p.id === worker.user_id);
          const profession = professions?.find(
            (p) => p.id === worker.profession_id
          );

          return (
            <div key={worker.id} className="rounded-md border border-gray-200 p-4">
              <p className="font-semibold">{profile?.full_name ?? "—"}</p>
              <p className="text-sm text-gray-600">
                {profession?.[nameKey]} · {nationalityLabel(worker.nationality, locale)} ·{" "}
                {worker.years_experience} {t("years")}
              </p>
              <p className="text-sm text-gray-600">
                📍 {governorateLabel(worker.base_governorate, locale) || "—"} →{" "}
                {(areaRows ?? [])
                  .filter((a) => a.worker_profile_id === worker.id)
                  .map((a) => governorateLabel(a.governorate, locale))
                  .join(", ") || "—"}
              </p>
              <ReviewActions
                workerProfileId={worker.id}
                idDocumentPath={worker.id_document_path}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
