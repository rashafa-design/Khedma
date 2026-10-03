"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function CheckinButtons() {
  const t = useTranslations("checkin");
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(stillAvailable: boolean) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("confirm_worker_details", {
      p_still_available: stillAvailable,
    });
    setBusy(false);
    if (rpcError) {
      setError(t("error"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(true)}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {t("stillAvailable")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(false)}
          className="rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {t("notAvailable")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
