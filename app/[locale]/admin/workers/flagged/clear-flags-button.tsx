"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClearFlagsButton({ workerProfileId }: { workerProfileId: string }) {
  const t = useTranslations("adminFlagged");
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clear() {
    if (!window.confirm(t("confirmClear"))) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("clear_worker_flags", {
      p_worker_profile_id: workerProfileId,
    });
    setBusy(false);
    if (rpcError) {
      setError(t("error"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={clear}
        disabled={busy}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
      >
        {t("clear")}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
