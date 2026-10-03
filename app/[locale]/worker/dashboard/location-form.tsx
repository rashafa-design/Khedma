"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ServiceAreaPicker } from "@/components/service-area-picker";
import { useRouter } from "@/i18n/navigation";
import { governorateOptions } from "@/lib/governorates";
import { createClient } from "@/lib/supabase/client";

// Lets an approved worker change where they live and where they work.
// Changes are saved with the button (not tick-by-tick) so the "at least one
// area" rule can be checked before anything is written.
export function LocationForm({
  workerProfileId,
  baseGovernorate,
  serviceAreas,
}: {
  workerProfileId: string;
  baseGovernorate: string | null;
  serviceAreas: string[];
}) {
  const t = useTranslations("location");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const governorates = governorateOptions(locale);

  const [base, setBase] = useState(baseGovernorate ?? "");
  const [areas, setAreas] = useState<string[]>(serviceAreas);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!base || areas.length === 0) {
      setError(t("atLeastOneArea"));
      return;
    }

    setSaving(true);

    const { error: baseError } = await supabase
      .from("worker_profiles")
      .update({ base_governorate: base })
      .eq("id", workerProfileId);

    // Add first, remove second: the worker is never left with zero areas
    // part-way through (the database refuses to delete the last one).
    const toAdd = areas.filter((a) => !serviceAreas.includes(a));
    const toRemove = serviceAreas.filter((a) => !areas.includes(a));

    let areaError = null;
    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("worker_service_areas")
        .insert(
          toAdd.map((governorate) => ({
            worker_profile_id: workerProfileId,
            governorate,
          }))
        );
      areaError = addError;
    }
    if (!areaError && toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("worker_service_areas")
        .delete()
        .eq("worker_profile_id", workerProfileId)
        .in("governorate", toRemove);
      areaError = removeError;
    }

    setSaving(false);

    if (baseError || areaError) {
      setError(t("saveError"));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-col gap-3 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-gray-600">{t("intro")}</p>

      <label className="flex flex-col gap-1 text-sm">
        {t("livesIn")}
        <select
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="" disabled>
            {t("selectGovernorate")}
          </option>
          {governorates.map((g) => (
            <option key={g.code} value={g.code}>
              {g.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <p>{t("worksIn")}</p>
        <ServiceAreaPicker selected={areas} onChange={setAreas} />
        <span className="text-xs text-gray-500">{t("worksInHint")}</span>
      </div>

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
