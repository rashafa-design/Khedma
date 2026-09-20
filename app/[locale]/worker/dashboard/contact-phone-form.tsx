"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function ContactPhoneForm({
  userId,
  phoneNumber,
}: {
  userId: string;
  phoneNumber: string | null;
}) {
  const t = useTranslations("worker");
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState(phoneNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ phone_number: phone })
      .eq("id", userId);

    setSubmitting(false);

    if (updateError) {
      setError(t("error"));
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("contactPhoneTitle")}</h2>
      <p className="text-xs text-gray-500">{t("contactPhoneHint")}</p>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? t("saving") : t("save")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
