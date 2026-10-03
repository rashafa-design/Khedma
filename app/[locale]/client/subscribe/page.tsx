import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpBox } from "@/components/help-box";
import { Link } from "@/i18n/navigation";
import { isActive, latestByPlan, PLAN_ORDER, PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type {
  PaymentRequestRow,
  SubscriptionRow,
  WorkType,
} from "@/lib/types";
import { SubscribeForm } from "./subscribe-form";

export default async function ClientSubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const planParam =
    sp.plan === "monthly" || sp.plan === "visits"
      ? (sp.plan as WorkType)
      : null;

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

  const [{ data: subscriptions }, { data: payments }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("client_id", user.id)
      .returns<SubscriptionRow[]>(),
    supabase
      .from("payment_requests")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .returns<PaymentRequestRow[]>(),
  ]);

  const subscriptionByPlan = latestByPlan(subscriptions ?? []);
  const latestPaymentByPlan: Partial<Record<WorkType, PaymentRequestRow>> = {};
  for (const payment of payments ?? []) {
    if (!latestPaymentByPlan[payment.plan]) {
      latestPaymentByPlan[payment.plan] = payment;
    }
  }

  const t = await getTranslations("payment");
  const tPlans = await getTranslations("plans");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Cairo",
    });

  // No plan chosen yet: show both, with where each one stands.
  if (!planParam) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-lg flex-col gap-6 px-4 py-16">
        <div>
          <h1 className="text-2xl font-bold">{tPlans("chooseTitle")}</h1>
          <p className="mt-2 text-sm text-gray-600">{tPlans("chooseIntro")}</p>
        </div>

        <HelpBox topic="plans" />

        {PLAN_ORDER.map((plan) => {
          const subscription = subscriptionByPlan[plan];
          const pending = latestPaymentByPlan[plan]?.status === "pending";
          const config = PLANS[plan];

          return (
            <section
              key={plan}
              className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-4"
            >
              <h2 className="text-lg font-semibold">
                {plan === "visits" ? "🔧 " : "📅 "}
                {tPlans(`${plan}Title`)}
              </h2>
              <p className="text-sm text-gray-600">{tPlans(`${plan}Body`)}</p>
              <p className="text-xl font-bold">
                {config.price.toLocaleString(locale)} {tPlans("egp")}
              </p>
              <p className="text-sm">
                {tPlans("youGet", {
                  slots: config.slots,
                  duration: tPlans(config.durationLabel),
                })}
              </p>

              {subscription && isActive(subscription) ? (
                <p className="text-sm font-medium text-green-800">
                  ✓ {tPlans("activeUntil", { date: formatDate(subscription.expires_at) })}{" "}
                  <Link href="/client/subscription" className="underline">
                    {tPlans("seeIt")}
                  </Link>
                </p>
              ) : pending ? (
                <p className="text-sm font-medium text-amber-800">
                  ⏳ {tPlans("pending")}
                </p>
              ) : (
                <Link
                  href={`/client/subscribe?plan=${plan}`}
                  className="mt-1 self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  {tPlans("choose")}
                </Link>
              )}
            </section>
          );
        })}
      </main>
    );
  }

  const plan = planParam;
  const config = PLANS[plan];

  if (isActive(subscriptionByPlan[plan])) {
    redirect("/client/subscription");
  }

  const latestPayment = latestPaymentByPlan[plan];

  if (latestPayment?.status === "pending") {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-sm flex-col justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("pendingTitle")}</h1>
        <p className="text-gray-600">{t("pendingBody")}</p>
        <HelpBox topic="paymentPending" />
        <Link href="/client/subscribe" className="text-sm underline">
          {tPlans("backToPlans")}
        </Link>
      </main>
    );
  }

  const paymentPhoneNumber =
    process.env.NEXT_PUBLIC_PAYMENT_PHONE_NUMBER || "01000000000";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div>
        <Link href="/client/subscribe" className="text-sm underline">
          ← {tPlans("backToPlans")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {plan === "visits" ? "🔧 " : "📅 "}
          {tPlans(`${plan}Title`)}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t(plan === "visits" ? "explainerVisits" : "explainerBody")}
        </p>
      </div>

      <HelpBox topic="subscribe" />

      <div className="rounded-md border border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-600">
          {t("payViaAmount", {
            amount: config.price.toLocaleString(locale),
          })}
        </p>
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

      <SubscribeForm userId={user.id} plan={plan} />
    </main>
  );
}
