import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-center text-2xl font-bold">{tCommon("appName")}</h1>

      <LoginForm />

      <p className="text-center text-sm text-gray-600">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-gray-900 underline">
          {t("signUp")}
        </Link>
      </p>
    </main>
  );
}
