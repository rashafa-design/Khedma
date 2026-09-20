"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function UnlockButton({
  subscriptionId,
  workerProfileId,
}: {
  subscriptionId: string;
  workerProfileId: string;
}) {
  const t = useTranslations("browse");
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("unlocks").insert({
      subscription_id: subscriptionId,
      worker_profile_id: workerProfileId,
    });

    setSubmitting(false);

    if (insertError) {
      setError(t("unlockError"));
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? t("unlocking") : t("unlock")}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
