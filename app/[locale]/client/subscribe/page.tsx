import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentRequestRow, SubscriptionRow } from "@/lib/types";
import { SubscribeForm } from "./subscribe-form";

export default async function ClientSubscribePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (!profile) {
    redirect("/complete-profile");
  }

  if (profile.role !== "client") {
    redirect("/dashboard");
  }

  const { data: latestSubscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (latestSubscription && new Date(latestSubscription.expires_at) > new Date()) {
    redirect("/client/subscription");
  }

  const { data: latestPayment } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PaymentRequestRow>();

  const t = await getTranslations("payment");

  if (latestPayment?.status === "pending") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("pendingTitle")}</h1>
        <p className="text-gray-600">{t("pendingBody")}</p>
      </main>
    );
  }

  const paymentPhoneNumber =
    process.env.NEXT_PUBLIC_PAYMENT_PHONE_NUMBER || "01000000000";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">{t("subscribeTitle")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("explainerBody")}</p>
      </div>

      <div className="rounded-md border border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-600">{t("payVia")}</p>
        <p className="mt-1 text-xl font-bold" dir="ltr">
          {paymentPhoneNumber}
        </p>
      </div>

      {latestPayment?.status === "rejected" && (
        <div className="rounded-md border border-red-200 p-4">
          <h2 className="font-semibold">{t("rejectedTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("rejectedBody")}</p>
          {latestPayment.rejection_reason && (
            <p className="mt-1 text-sm text-gray-600">
              {t("reason")}: {latestPayment.rejection_reason}
            </p>
          )}
        </div>
      )}

      <SubscribeForm userId={user.id} />
    </main>
  );
}
