"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReviewActions({
  workerProfileId,
  idDocumentPath,
}: {
  workerProfileId: string;
  idDocumentPath: string;
}) {
  const t = useTranslations("adminReview");
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleViewId() {
    setError(null);
    const res = await fetch(
      `/api/admin/worker-id-url?path=${encodeURIComponent(idDocumentPath)}`
    );
    const body = await res.json();

    if (body.url) {
      window.open(body.url, "_blank", "noopener,noreferrer");
    } else {
      setError(t("error"));
    }
  }

  async function review(status: "approved" | "rejected", rejectionReason?: string) {
    setError(null);
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("worker_profiles")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason ?? null,
      })
      .eq("id", workerProfileId);

    setSubmitting(false);

    if (updateError) {
      setError(t("error"));
      return;
    }

    router.refresh();
  }

  function handleReject() {
    const reason = window.prompt(t("rejectPrompt"));
    if (reason === null) {
      return;
    }
    review("rejected", reason);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleViewId}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
      >
        {t("viewId")}
      </button>
      <button
        type="button"
        onClick={() => review("approved")}
        disabled={submitting}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {t("approve")}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={submitting}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {t("reject")}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
