import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle<{ role: string; full_name: string }>();
    role = profile?.role ?? null;
    // Someone who signed in with Google but hasn't finished their profile yet
    // has no name on file - show their email rather than nothing.
    fullName = profile?.full_name ?? user.email ?? null;
  }

  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tDashboard = await getTranslations("dashboard");

  const roleLabel =
    role === "worker"
      ? tDashboard("roleWorker")
      : role === "admin"
        ? tDashboard("roleAdmin")
        : role === "client"
          ? tDashboard("roleClient")
          : null;

  const links: { href: string; label: string }[] = [];

  if (!user) {
    links.push(
      { href: "/login", label: t("login") },
      { href: "/signup", label: t("signup") },
      { href: "/download", label: t("androidApp") }
    );
  } else {
    links.push({ href: "/dashboard", label: t("dashboard") });

    if (role === "client") {
      links.push(
        { href: "/browse", label: t("browse") },
        { href: "/client/subscription", label: t("subscription") }
      );
    } else if (role === "worker") {
      links.push({ href: "/worker/dashboard", label: t("myListing") });
    } else if (role === "admin") {
      links.push(
        { href: "/admin", label: t("admin") },
        { href: "/browse", label: t("browse") }
      );
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={user ? "/dashboard" : "/"}
          className="shrink-0 text-lg font-bold"
        >
          {tCommon("appName")}
        </Link>
        {user && fullName && (
          <Link
            href="/dashboard"
            title={fullName}
            className="min-w-0 flex-1 text-start leading-tight"
          >
            <span className="block truncate text-sm font-medium">{fullName}</span>
            {roleLabel && (
              <span className="block text-xs text-gray-500">{roleLabel}</span>
            )}
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          {user && <SignOutButton />}
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-2">
        <NavLinks links={links} />
      </div>
    </header>
  );
}
