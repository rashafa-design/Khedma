"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { WorkerAvailability } from "@/lib/types";

export function AvailabilityToggle({
  workerProfileId,
  availability,
}: {
  workerProfileId: string;
  availability: WorkerAvailability;
}) {
  const t = useTranslations("worker");
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    const next: WorkerAvailability =
      availability === "available" ? "unavailable" : "available";
    await supabase
      .from("worker_profiles")
      .update({ availability: next })
      .eq("id", workerProfileId);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
    >
      {availability === "available" ? t("markUnavailable") : t("markAvailable")}
    </button>
  );
}
