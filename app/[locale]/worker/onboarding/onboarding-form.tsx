"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ServiceAreaPicker } from "@/components/service-area-picker";
import { governorateOptions } from "@/lib/governorates";
import { nationalityOptions } from "@/lib/nationalities";
import { createClient } from "@/lib/supabase/client";
import type { ProfessionRow } from "@/lib/types";

export function OnboardingForm({
  userId,
  professions,
  nameKey,
}: {
  userId: string;
  professions: ProfessionRow[];
  nameKey: "name_en" | "name_ar";
}) {
  const t = useTranslations("worker");
  const tLocation = useTranslations("location");
  const locale = useLocale();
  const governorates = governorateOptions(locale);
  const router = useRouter();
  const supabase = createClient();
  const nationalities = nationalityOptions(locale);

  const [professionId, setProfessionId] = useState(professions[0]?.id ?? "");
  const [nationality, setNationality] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [baseGovernorate, setBaseGovernorate] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!idFile) {
      setError(t("error"));
      return;
    }

    if (!baseGovernorate || serviceAreas.length === 0) {
      setError(tLocation("atLeastOneArea"));
      return;
    }

    setSubmitting(true);

    const idPath = `${userId}/${crypto.randomUUID()}-${idFile.name}`;
    const { error: idUploadError } = await supabase.storage
      .from("worker-id-documents")
      .upload(idPath, idFile);

    if (idUploadError) {
      setError(t("error"));
      setSubmitting(false);
      return;
    }

    let photoPath: string | null = null;
    if (photoFile) {
      photoPath = `${userId}/${crypto.randomUUID()}-${photoFile.name}`;
      const { error: photoUploadError } = await supabase.storage
        .from("worker-photos")
        .upload(photoPath, photoFile);

      if (photoUploadError) {
        setError(t("error"));
        setSubmitting(false);
        return;
      }
    }

    // Pick the id here so the service areas can point at the new profile
    // without needing to read it back.
    const workerProfileId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("worker_profiles").insert({
      id: workerProfileId,
      user_id: userId,
      profession_id: professionId,
      nationality,
      base_governorate: baseGovernorate,
      years_experience: Number(yearsExperience) || 0,
      id_document_path: idPath,
      photo_path: photoPath,
    });

    if (insertError) {
      setSubmitting(false);
      setError(t("error"));
      return;
    }

    const { error: areasError } = await supabase
      .from("worker_service_areas")
      .insert(
        serviceAreas.map((governorate) => ({
          worker_profile_id: workerProfileId,
          governorate,
        }))
      );

    setSubmitting(false);

    // The profile exists either way; if only the areas failed, the worker
    // dashboard will ask them to add where they work.
    if (areasError) {
      setError(t("error"));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <select
        value={professionId}
        onChange={(e) => setProfessionId(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        {professions.map((profession) => (
          <option key={profession.id} value={profession.id}>
            {profession[nameKey]}
          </option>
        ))}
      </select>

      <select
        required
        value={nationality}
        onChange={(e) => setNationality(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="" disabled>
          {t("selectNationality")}
        </option>
        {nationalities.map((n) => (
          <option key={n.code} value={n.code}>
            {n.label}
          </option>
        ))}
      </select>

      <label className="flex flex-col gap-1 text-sm">
        {tLocation("livesIn")}
        <select
          required
          value={baseGovernorate}
          onChange={(e) => {
            setBaseGovernorate(e.target.value);
            // Most workers serve the area they live in - start there.
            if (serviceAreas.length === 0) setServiceAreas([e.target.value]);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="" disabled>
            {tLocation("selectGovernorate")}
          </option>
          {governorates.map((g) => (
            <option key={g.code} value={g.code}>
              {g.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{tLocation("livesInHint")}</span>
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <p>{tLocation("worksIn")}</p>
        <ServiceAreaPicker selected={serviceAreas} onChange={setServiceAreas} />
        <span className="text-xs text-gray-500">{tLocation("worksInHint")}</span>
      </div>

      <input
        type="number"
        required
        min={0}
        step={0.5}
        placeholder={t("yearsExperience")}
        value={yearsExperience}
        onChange={(e) => setYearsExperience(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />

      <label className="flex flex-col gap-1 text-sm">
        {t("idDocument")}
        <input
          type="file"
          required
          accept="image/*,application/pdf"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-xs text-gray-500">{t("idDocumentHint")}</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("photo")}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
