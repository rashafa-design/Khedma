"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
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
  const router = useRouter();
  const supabase = createClient();

  const [professionId, setProfessionId] = useState(professions[0]?.id ?? "");
  const [nationality, setNationality] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
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

    const { error: insertError } = await supabase.from("worker_profiles").insert({
      user_id: userId,
      profession_id: professionId,
      nationality,
      years_experience: Number(yearsExperience) || 0,
      id_document_path: idPath,
      photo_path: photoPath,
    });

    setSubmitting(false);

    if (insertError) {
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

      <input
        type="text"
        required
        placeholder={t("nationality")}
        value={nationality}
        onChange={(e) => setNationality(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />

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
