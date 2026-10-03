"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function RequestButtons({ requestId }: { requestId: string }) {
  const t = useTranslations("requests");
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(available: boolean) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      "respond_availability_request",
      { p_request_id: requestId, p_available: available }
    );
    setBusy(false);
    if (rpcError) {
      setError(t("error"));
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(true)}
          className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {t("yes")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(false)}
          className="rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {t("no")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
