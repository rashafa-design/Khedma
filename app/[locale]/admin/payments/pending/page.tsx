import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentRequestRow, ProfileRow } from "@/lib/types";
import { ReviewActions } from "./review-actions";

export default async function AdminPendingPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: pendingPayments } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .returns<PaymentRequestRow[]>();

  const t = await getTranslations("adminPayments");
  const tPayment = await getTranslations("payment");

  if (!pendingPayments || pendingPayments.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-gray-600">{t("empty")}</p>
      </main>
    );
  }

  const clientIds = [
    ...new Set(pendingPayments.map((payment) => payment.client_id)),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", clientIds)
    .returns<ProfileRow[]>();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="flex flex-col gap-4">
        {pendingPayments.map((payment) => {
          const profile = profiles?.find((p) => p.id === payment.client_id);
          const methodLabel =
            payment.payment_method === "instapay"
              ? tPayment("methodInstapay")
              : tPayment("methodVodafoneCash");

          return (
            <div key={payment.id} className="rounded-md border border-gray-200 p-4">
              <p className="font-semibold">
                {t("client")}: {profile?.full_name ?? "—"}
              </p>
              <p className="text-sm text-gray-600">
                {payment.amount} {payment.currency} · {t("method")}:{" "}
                {methodLabel}
              </p>
              <ReviewActions
                paymentRequestId={payment.id}
                proofPath={payment.proof_screenshot_path}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
