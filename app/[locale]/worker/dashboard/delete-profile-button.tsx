"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteProfileButton({
  workerProfileId,
}: {
  workerProfileId: string;
}) {
  const t = useTranslations("worker");
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (!window.confirm(t("deleteProfileBody"))) {
      return;
    }

    setSubmitting(true);
    await supabase.from("worker_profiles").delete().eq("id", workerProfileId);
    setSubmitting(false);
    router.push("/worker/onboarding");
    router.refresh();
  }

  return (
    <div className="rounded-md border border-red-200 p-4">
      <h2 className="font-semibold">{t("deleteProfileTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("deleteProfileBody")}</p>
      <button
        onClick={handleClick}
        disabled={submitting}
        className="mt-3 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {submitting ? t("deleting") : t("deleteProfile")}
      </button>
    </div>
  );
}
