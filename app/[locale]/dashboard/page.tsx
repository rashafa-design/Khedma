import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";
import { SignOutButton } from "./sign-out-button";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">
            {t("welcome")}, {profile.full_name}
          </p>
          <p className="text-sm text-gray-600">
            {user.email} · {t("role")}: {profile.role}
          </p>
        </div>
        <SignOutButton />
      </div>
    </main>
  );
}
