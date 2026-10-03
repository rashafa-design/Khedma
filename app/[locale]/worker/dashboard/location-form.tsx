"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { NeighborhoodPicker } from "@/components/neighborhood-picker";
import { ServiceAreaPicker } from "@/components/service-area-picker";
import { useRouter } from "@/i18n/navigation";
import { governorateOptions } from "@/lib/governorates";
import { governorateOfArea } from "@/lib/neighborhoods";
import { createClient } from "@/lib/supabase/client";

// Lets an approved worker change where they live and where they work.
// Changes are saved with the button (not tick-by-tick) so the "at least one
// area" rule can be checked before anything is written.
export function LocationForm({
  workerProfileId,
  baseGovernorate,
  serviceAreas,
  neighborhoods,
  worksByVisits,
  transportFee,
}: {
  workerProfileId: string;
  baseGovernorate: string | null;
  serviceAreas: string[];
  neighborhoods: string[];
  worksByVisits: boolean;
  transportFee: number | null;
}) {
  const t = useTranslations("location");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const governorates = governorateOptions(locale);

  const [base, setBase] = useState(baseGovernorate ?? "");
  const [areas, setAreas] = useState<string[]>(serviceAreas);
  const [spots, setSpots] = useState<string[]>(neighborhoods);
  const [fee, setFee] = useState(transportFee === null ? "" : String(transportFee));
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

    // Drop areas that belong to a governorate the worker no longer works in.
    const keptSpots = spots.filter((s) => {
      const governorate = governorateOfArea(s);
      return !governorate || areas.includes(governorate);
    });

    if (worksByVisits && keptSpots.length === 0) {
      setError(t("neighborhoodsRequired"));
      return;
    }

    const feeNumber = fee.trim() === "" ? null : Number(fee);
    if (worksByVisits && (feeNumber === null || !(feeNumber >= 0))) {
      setError(t("transportRequired"));
      return;
    }

    setSaving(true);

    const { error: baseError } = await supabase
      .from("worker_profiles")
      .update({
        base_governorate: base,
        service_neighborhoods: keptSpots,
        transport_fee: feeNumber !== null && feeNumber >= 0 ? feeNumber : null,
      })
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

    setSpots(keptSpots);
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

      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">
          {worksByVisits
            ? t("neighborhoodsTitleRequired")
            : t("neighborhoodsTitleOptional")}
        </p>
        <NeighborhoodPicker
          governorates={areas}
          value={spots}
          onChange={setSpots}
        />
        <span className="text-xs text-gray-500">{t("neighborhoodsHint")}</span>
      </div>

      {worksByVisits && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("transportTitle")}</span>
          <span className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
            {t("transportSeparateNote")}
          </span>
          <input
            type="number"
            min={0}
            max={10000}
            step={1}
            value={fee}
            placeholder="0"
            onChange={(e) => setFee(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
          <span className="text-xs text-gray-500">{t("transportHint")}</span>
        </label>
      )}

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
