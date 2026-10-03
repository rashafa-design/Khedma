"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const OUTCOMES = [
  ["reached_available", "answerGood"],
  ["reached_unavailable", "answerUnavailable"],
  ["not_reached", "answerNotReached"],
] as const;

export function FollowupButtons({
  unlockId,
  workerProfileId,
}: {
  unlockId: string;
  workerProfileId: string;
}) {
  const t = useTranslations("followup");
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(outcome: string) {
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("unlock_feedback")
      .insert({
        unlock_id: unlockId,
        worker_profile_id: workerProfileId,
        outcome,
      });
    setBusy(false);
    if (insertError) {
      setError(t("error"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map(([outcome, key]) => (
          <button
            key={outcome}
            type="button"
            disabled={busy}
            onClick={() => answer(outcome)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            {t(key)}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
