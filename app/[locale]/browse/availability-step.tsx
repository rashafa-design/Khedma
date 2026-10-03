"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { UnlockButton } from "./unlock-button";

export type CheckState =
  | { kind: "none" }
  | { kind: "waiting"; expiresAt: string }
  | { kind: "confirmed" }
  | { kind: "declined" }
  | { kind: "no_reply" };

// What a client sees where the Unlock button used to be: first ask the
// worker if they are available (free), and only once they say yes can the
// client spend a slot.
export function AvailabilityStep({
  workerProfileId,
  subscriptionId,
  previouslyUnlockedOn,
  check,
  plan,
}: {
  workerProfileId: string;
  subscriptionId: string;
  previouslyUnlockedOn: string | null;
  check: CheckState;
  plan: "monthly" | "visits";
}) {
  const t = useTranslations("check");
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // While waiting, look for the worker's answer every 15 seconds.
  useEffect(() => {
    if (check.kind !== "waiting") return;
    const timer = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(timer);
  }, [check.kind, router]);

  async function ask() {
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("availability_requests")
      .insert({ worker_profile_id: workerProfileId, plan });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.message.includes("at most 3")
          ? t("tooMany")
          : insertError.message.includes("already asked")
            ? t("alreadyAsked")
            : insertError.message.includes("active plan")
              ? t("noPlan")
              : t("error")
      );
      router.refresh();
      return;
    }
    // Tell the worker's phone. A failure here must never block the client:
    // the request itself is already saved and shows on the worker's dashboard.
    fetch("/api/push/notify-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerProfileId }),
    }).catch(() => {});
    router.refresh();
  }

  if (check.kind === "confirmed") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-green-800">{t("confirmed")}</p>
        <UnlockButton
          subscriptionId={subscriptionId}
          workerProfileId={workerProfileId}
          previouslyUnlockedOn={previouslyUnlockedOn}
        />
      </div>
    );
  }

  if (check.kind === "waiting") {
    const hoursLeft = Math.max(
      1,
      Math.ceil((new Date(check.expiresAt).getTime() - Date.now()) / 3_600_000)
    );
    return (
      <p className="text-sm text-gray-700">
        ⏳ {t("waiting", { hours: hoursLeft })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {check.kind === "declined" && (
        <p className="text-sm text-red-700">{t("declined")}</p>
      )}
      {check.kind === "no_reply" && (
        <p className="text-sm text-amber-800">{t("noReply")}</p>
      )}
      <div>
        <button
          type="button"
          onClick={ask}
          disabled={busy || check.kind === "declined"}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy
            ? t("asking")
            : check.kind === "no_reply"
              ? t("askAgain")
              : t("ask")}
        </button>
        {check.kind === "none" && (
          <p className="mt-1 text-xs text-gray-500">{t("askHint")}</p>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
