import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CompleteProfileForm } from "./complete-profile-form";

export default async function CompleteProfilePage({
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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    redirect("/dashboard");
  }

  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-center text-2xl font-bold">
        {t("completeProfileTitle")}
      </h1>
      <CompleteProfileForm userId={user.id} />
    </main>
  );
}
