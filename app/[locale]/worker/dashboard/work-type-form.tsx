"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { WorkTypePicker } from "@/components/work-type-picker";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { WorkType } from "@/lib/types";

export function WorkTypeForm({
  workerProfileId,
  workTypes,
}: {
  workerProfileId: string;
  workTypes: WorkType[];
}) {
  const t = useTranslations("workType");
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<WorkType[]>(workTypes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (selected.length === 0) {
      setError(t("atLeastOne"));
      return;
    }
    // Switching group changes which plan clients need to see this worker's
    // number, so warn before doing it.
    if (selected[0] !== workTypes[0] && !window.confirm(t("confirmChange"))) {
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("worker_profiles")
      .update({ work_types: selected })
      .eq("id", workerProfileId);
    setSaving(false);
    if (updateError) {
      setError(t("error"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-3 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-gray-600">{t("intro")}</p>
      <WorkTypePicker selected={selected} onChange={setSelected} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">{t("saved")}</p>}
      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </form>
  );
}
