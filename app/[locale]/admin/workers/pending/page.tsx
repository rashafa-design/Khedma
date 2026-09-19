import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfessionRow, ProfileRow, WorkerProfileRow } from "@/lib/types";
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
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-gray-600">{t("empty")}</p>
      </main>
    );
  }

  const userIds = pendingWorkers.map((worker) => worker.user_id);
  const professionIds = [
    ...new Set(pendingWorkers.map((worker) => worker.profession_id)),
  ];

  const [{ data: profiles }, { data: professions }] = await Promise.all([
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
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

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
                {profession?.[nameKey]} · {worker.nationality} ·{" "}
                {worker.years_experience} {t("years")}
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
