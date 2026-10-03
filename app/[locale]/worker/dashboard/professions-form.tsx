"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProfessionRow } from "@/lib/types";

// "Your professions": the main one (picked at sign-up, can't be removed) plus
// any others the worker also offers. Each profession brings its own list of
// tasks to price below.
export function ProfessionsForm({
  workerProfileId,
  mainProfessionId,
  held,
  available,
  taskTypeIdsByProfession,
  nameKey,
}: {
  workerProfileId: string;
  mainProfessionId: string;
  held: ProfessionRow[];
  available: ProfessionRow[];
  taskTypeIdsByProfession: Record<string, string[]>;
  nameKey: "name_en" | "name_ar";
}) {
  const t = useTranslations("professions");
  const router = useRouter();
  const supabase = createClient();
  const [toAdd, setToAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!toAdd) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("worker_professions")
      .insert({ worker_profile_id: workerProfileId, profession_id: toAdd });
    setBusy(false);
    if (insertError) {
      setError(t("error"));
      return;
    }
    setToAdd("");
    router.refresh();
  }

  async function remove(professionId: string) {
    if (!window.confirm(t("confirmRemove"))) return;
    setBusy(true);
    setError(null);

    // Take that profession's priced tasks off the listing first, so nothing
    // for a profession they no longer offer is left showing to clients.
    const taskIds = taskTypeIdsByProfession[professionId] ?? [];
    if (taskIds.length > 0) {
      await supabase
        .from("worker_task_entries")
        .delete()
        .eq("worker_profile_id", workerProfileId)
        .in("task_type_id", taskIds);
    }

    const { error: deleteError } = await supabase
      .from("worker_professions")
      .delete()
      .eq("worker_profile_id", workerProfileId)
      .eq("profession_id", professionId);
    setBusy(false);
    if (deleteError) {
      setError(t("error"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-gray-600">{t("intro")}</p>

      <ul className="flex flex-col gap-2">
        {held.map((profession) => (
          <li
            key={profession.id}
            className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm"
          >
            <span>
              <span className="font-medium">{profession[nameKey]}</span>
              {profession.id === mainProfessionId && (
                <span className="ms-2 rounded bg-gray-200 px-2 py-0.5 text-xs">
                  {t("main")}
                </span>
              )}
            </span>
            {profession.id !== mainProfessionId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(profession.id)}
                className="text-xs font-medium text-red-700 underline disabled:opacity-50"
              >
                {t("remove")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            <option value="">{t("pick")}</option>
            {available.map((profession) => (
              <option key={profession.id} value={profession.id}>
                {profession[nameKey]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !toAdd}
            onClick={add}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {t("add")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
