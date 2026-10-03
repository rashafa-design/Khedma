import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpBox } from "@/components/help-box";
import { FollowupPrompts } from "@/components/followup-prompts";
import { WorkerCheckin } from "@/components/worker-checkin";
import { WorkerRequests } from "@/components/worker-requests";
import { Link } from "@/i18n/navigation";
import { nationalityLabel } from "@/lib/nationalities";
import { createClient } from "@/lib/supabase/server";
import type {
  ProfessionRow,
  ProfileRow,
  SubscriptionRow,
  WorkerProfileRow,
} from "@/lib/types";

type InfoRow = { label: string; value: string; ltr?: boolean };

export default async function DashboardPage({
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
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    redirect("/complete-profile");
  }

  const t = await getTranslations("dashboard");
  const tWorker = await getTranslations("worker");

  const formatDate = (iso: string, withDay = true) =>
    new Date(iso).toLocaleDateString(locale, {
      day: withDay ? "numeric" : undefined,
      month: withDay ? "short" : "long",
      year: "numeric",
      timeZone: "Africa/Cairo",
    });

  const roleLabel =
    profile.role === "worker"
      ? t("roleWorker")
      : profile.role === "admin"
        ? t("roleAdmin")
        : t("roleClient");

  // A brand-new account gets a proper welcome; after that, a greeting that
  // follows the time of day in Egypt.
  const firstName = profile.full_name.trim().split(/\s+/)[0] || profile.full_name;
  const isNewAccount =
    Date.now() - new Date(profile.created_at).getTime() < 24 * 60 * 60 * 1000;
  const cairoHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Cairo",
    }).format(new Date())
  );
  const greeting = isNewAccount
    ? t("welcomeNew", { name: firstName })
    : cairoHour < 12
      ? t("greetingMorning", { name: firstName })
      : cairoHour < 18
        ? t("greetingAfternoon", { name: firstName })
        : t("greetingEvening", { name: firstName });

  let intro =
    profile.role === "worker"
      ? t("introWorker")
      : profile.role === "admin"
        ? t("introAdmin")
        : t("introClient");

  // Everyone's basic details.
  const accountRows: InfoRow[] = [
    { label: t("fieldName"), value: profile.full_name },
    { label: t("fieldEmail"), value: user.email ?? "", ltr: true },
    {
      label: t("fieldPhone"),
      value: profile.phone_number || t("notProvided"),
      ltr: !!profile.phone_number,
    },
    { label: t("role"), value: roleLabel },
    { label: t("memberSince"), value: formatDate(profile.created_at, false) },
  ];

  // Role-specific summary.
  let summaryTitle: string | null = null;
  let summaryRows: InfoRow[] = [];
  let summaryNote: string | null = null;
  let summaryAction: { href: string; label: string } | null = null;

  if (profile.role === "client") {
    summaryTitle = t("subscriptionTitle");

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    if (subscription && new Date(subscription.expires_at) > new Date()) {
      const { count } = await supabase
        .from("unlocks")
        .select("*", { count: "exact", head: true })
        .eq("subscription_id", subscription.id);
      const used = count ?? 0;

      summaryRows = [
        {
          label: t("unlockedWorkers"),
          value: t("unlockedOf", { used, total: subscription.slots_total }),
        },
        { label: t("slotsLeft"), value: String(subscription.slots_total - used) },
        { label: t("accessUntil"), value: formatDate(subscription.expires_at) },
      ];
    } else {
      summaryNote = t("noActiveSubscription");
      summaryAction = { href: "/client/subscribe", label: t("subscribeNow") };
    }
  } else if (profile.role === "worker") {
    summaryTitle = t("listingTitle");

    const { data: workerProfile } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<WorkerProfileRow>();

    if (!workerProfile) {
      intro = t("introWorkerNew");
      summaryNote = t("noWorkerProfile");
      summaryAction = {
        href: "/worker/onboarding",
        label: t("workerOnboardingCta"),
      };
    } else {
      const [{ data: profession }, { count: servicesCount }] = await Promise.all([
        supabase
          .from("professions")
          .select("*")
          .eq("id", workerProfile.profession_id)
          .maybeSingle<ProfessionRow>(),
        supabase
          .from("worker_task_entries")
          .select("*", { count: "exact", head: true })
          .eq("worker_profile_id", workerProfile.id),
      ]);

      if (workerProfile.status === "pending_review") {
        intro = t("introWorkerPending");
      } else if (workerProfile.status === "rejected") {
        intro = t("introWorkerRejected");
      }

      const statusLabel =
        workerProfile.status === "approved"
          ? t("statusApproved")
          : workerProfile.status === "rejected"
            ? t("statusRejected")
            : t("statusPending");

      summaryRows = [
        {
          label: tWorker("profession"),
          value: profession?.[locale === "ar" ? "name_ar" : "name_en"] ?? "—",
        },
        {
          label: tWorker("nationality"),
          value: nationalityLabel(workerProfile.nationality, locale),
        },
        {
          label: tWorker("yearsExperience"),
          value: String(workerProfile.years_experience),
        },
        { label: t("status"), value: statusLabel },
        {
          label: tWorker("availability"),
          value: tWorker(workerProfile.availability),
        },
        { label: t("servicesOffered"), value: String(servicesCount ?? 0) },
        {
          label: t("lastConfirmed"),
          value: formatDate(workerProfile.last_confirmed_at),
        },
      ];

      if (workerProfile.status === "approved") {
        summaryAction = {
          href: "/worker/dashboard",
          label: t("manageListing"),
        };
      } else {
        summaryAction = {
          href: "/worker/onboarding",
          label: t("viewApplication"),
        };
      }
    }
  } else if (profile.role === "admin") {
    summaryTitle = t("needsAttention");

    const [{ count: pendingWorkers }, { count: pendingPayments }] =
      await Promise.all([
        supabase
          .from("worker_profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_review"),
        supabase
          .from("payment_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

    const { data: reportedWorkers } = await supabase.rpc(
      "get_reported_worker_count"
    );

    summaryRows = [
      { label: t("pendingWorkers"), value: String(pendingWorkers ?? 0) },
      { label: t("pendingPayments"), value: String(pendingPayments ?? 0) },
      {
        label: t("reportedWorkers"),
        value: String((reportedWorkers as number | null) ?? 0),
      },
    ];
    summaryAction = { href: "/admin", label: t("openAdmin") };
  }

  const rowList = (rows: InfoRow[]) => (
    <dl className="divide-y divide-gray-100 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 py-2">
          <dt className="text-gray-600">{row.label}</dt>
          <dd className="font-medium" dir={row.ltr ? "ltr" : undefined}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">{greeting}</h1>
        <p className="mt-1 text-gray-600">{intro}</p>
      </div>

      {profile.role === "worker" && (
        <>
          <WorkerRequests />
          <WorkerCheckin />
        </>
      )}
      {profile.role === "client" && <FollowupPrompts />}

      <HelpBox
        topic={
          profile.role === "worker"
            ? "dashboardWorker"
            : profile.role === "admin"
              ? "dashboardAdmin"
              : "dashboardClient"
        }
      />

      {summaryTitle && (
        <section className="rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">{summaryTitle}</h2>
          {summaryRows.length > 0 && rowList(summaryRows)}
          {summaryNote && <p className="text-sm text-gray-600">{summaryNote}</p>}
          {summaryAction && (
            <Link
              href={summaryAction.href}
              className="mt-3 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              {summaryAction.label}
            </Link>
          )}
        </section>
      )}

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">{t("yourInfo")}</h2>
        {rowList(accountRows)}
      </section>

      {profile.role === "client" && (
        <div className="flex gap-3">
          <Link
            href="/browse"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {t("browseCta")}
          </Link>
          <Link
            href="/client/subscription"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            {t("subscriptionCta")}
          </Link>
        </div>
      )}
    </main>
  );
}
