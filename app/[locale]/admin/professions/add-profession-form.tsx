"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function AddProfessionForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const supabase = createClient();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: insertError } = await supabase.from("professions").insert({
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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("addProfessionTitle")}</h2>
      <input
        type="text"
        required
        placeholder={t("professionNameEn")}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />
      <input
        type="text"
        required
        placeholder={t("professionNameAr")}
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
