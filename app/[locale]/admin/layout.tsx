import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const t = await getTranslations("admin");

  return (
    <div>
      <nav className="flex gap-4 border-b border-gray-200 px-4 py-3 text-sm">
        <Link href="/admin" className="font-medium hover:underline">
          {t("navOverview")}
        </Link>
        <Link href="/admin/professions" className="font-medium hover:underline">
          {t("navProfessions")}
        </Link>
        <Link
          href="/admin/workers/pending"
          className="font-medium hover:underline"
        >
          {t("navPendingWorkers")}
        </Link>
        <Link
          href="/admin/payments/pending"
          className="font-medium hover:underline"
        >
          {t("navPendingPayments")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
