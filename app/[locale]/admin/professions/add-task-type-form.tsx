"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProfessionRow } from "@/lib/types";

export function AddTaskTypeForm({
  professions,
  nameKey,
}: {
  professions: ProfessionRow[];
  nameKey: "name_en" | "name_ar";
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const supabase = createClient();

  const [professionId, setProfessionId] = useState(professions[0]?.id ?? "");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: insertError } = await supabase.from("task_types").insert({
      profession_id: professionId,
      name_en: nameEn,
      name_ar: nameAr,
    });

    setSubmitting(false);

    if (insertError) {
      setError(t("error"));
      return;
    }

    setNameEn("");
    setNameAr("");
    router.refresh();
  }

  if (professions.length === 0) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("addTaskTitle")}</h2>
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
        placeholder={t("taskNameEn")}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />
      <input
        type="text"
        required
        placeholder={t("taskNameAr")}
        value={nameAr}
        onChange={(e) => setNameAr(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? t("saving") : t("add")}
      </button>
    </form>
  );
}
