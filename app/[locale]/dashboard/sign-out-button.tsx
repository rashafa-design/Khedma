"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
    >
      {t("signOut")}
    </button>
  );
}
