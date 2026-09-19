import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfessionRow, WorkerProfileRow } from "@/lib/types";
import { OnboardingForm } from "./onboarding-form";

export default async function WorkerOnboardingPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (!profile) {
    redirect("/complete-profile");
  }

  if (profile.role !== "worker") {
    redirect("/dashboard");
  }

  const t = await getTranslations("worker");

  const { data: workerProfile } = await supabase
    .from("worker_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<WorkerProfileRow>();

  if (workerProfile) {
    if (workerProfile.status === "approved") {
      redirect("/worker/dashboard");
    }

    const statusKey =
      workerProfile.status === "rejected" ? "statusRejected" : "statusPending";

    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t(`${statusKey}Title`)}</h1>
        <p className="text-gray-600">{t(`${statusKey}Body`)}</p>
        {workerProfile.status === "rejected" && workerProfile.rejection_reason && (
          <p className="text-sm text-gray-600">
            {t("reason")}: {workerProfile.rejection_reason}
          </p>
        )}
      </main>
    );
  }

  const { data: professions } = await supabase
    .from("professions")
    .select("*")
    .eq("is_active", true)
    .order("created_at")
    .returns<ProfessionRow[]>();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">{t("onboardingTitle")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("onboardingSubtitle")}</p>
      </div>

      {(professions ?? []).length === 0 ? (
        <p className="text-sm text-gray-600">{t("noProfessionsYet")}</p>
      ) : (
        <OnboardingForm
          userId={user.id}
          professions={professions ?? []}
          nameKey={locale === "ar" ? "name_ar" : "name_en"}
        />
      )}
    </main>
  );
}
