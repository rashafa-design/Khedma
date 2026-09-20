"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PaymentMethod } from "@/lib/types";

export function SubscribeForm({ userId }: { userId: string }) {
  const t = useTranslations("payment");
  const router = useRouter();
  const supabase = createClient();

  const [method, setMethod] = useState<PaymentMethod>("instapay");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proofFile) {
      setError(t("error"));
      return;
    }

    setSubmitting(true);

    const proofPath = `${userId}/${crypto.randomUUID()}-${proofFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, proofFile);

    if (uploadError) {
      setError(t("error"));
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("payment_requests").insert({
      client_id: userId,
      amount: 2000,
      currency: "EGP",
      payment_method: method,
      proof_screenshot_path: proofPath,
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          {t("paymentMethod")}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="method"
            checked={method === "instapay"}
            onChange={() => setMethod("instapay")}
          />
          {t("methodInstapay")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="method"
            checked={method === "vodafone_cash"}
            onChange={() => setMethod("vodafone_cash")}
          />
          {t("methodVodafoneCash")}
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        {t("proofUpload")}
        <input
          type="file"
          required
          accept="image/*"
          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
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
