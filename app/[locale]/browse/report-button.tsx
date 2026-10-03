"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REASONS = ["number_not_working", "not_looking", "found_job", "other"] as const;

// Shown on a worker the client has unlocked: lets them say the number
// doesn't work, or the worker isn't looking / already found a job.
export function ReportButton({ workerProfileId }: { workerProfileId: string }) {
  const t = useTranslations("report");
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("worker_reports")
      .insert({ worker_profile_id: workerProfileId, reason });
    setBusy(false);
    if (insertError) {
      setError(t("error"));
      return;
    }
    setDone(true);
    setOpen(false);
  }

  if (done) {
    return <p className="mt-2 text-xs text-green-700">{t("thanks")}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-medium text-gray-600 underline"
      >
        {t("open")}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-gray-300 bg-white p-3 text-sm">
      <p className="font-medium">{t("question")}</p>
      {REASONS.map((r) => (
        <label key={r} className="flex items-center gap-2">
          <input
            type="radio"
            name={`report-${workerProfileId}`}
            checked={reason === r}
            onChange={() => setReason(r)}
          />
          {t(r)}
        </label>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {t("send")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
