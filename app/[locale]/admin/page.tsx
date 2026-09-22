import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [{ count: pendingWorkers }, { count: pendingPayments }, { count: activeSubscriptions }] =
    await Promise.all([
      supabase
        .from("worker_profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase
        .from("payment_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString()),
    ]);

  const t = await getTranslations("admin");

  const stats = [
    {
      label: t("pendingWorkersCount"),
      value: pendingWorkers ?? 0,
      href: "/admin/workers/pending",
    },
    {
      label: t("pendingPaymentsCount"),
      value: pendingPayments ?? 0,
      href: "/admin/payments/pending",
    },
    {
      label: t("activeSubscriptionsCount"),
      value: activeSubscriptions ?? 0,
      href: null,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("overviewTitle")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const card = (
            <div className="rounded-md border border-gray-200 p-6 text-center">
              <p className="text-4xl font-bold">{stat.value}</p>
              <p className="mt-2 text-sm text-gray-600">{stat.label}</p>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="hover:bg-gray-50">
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>
    </main>
  );
}
