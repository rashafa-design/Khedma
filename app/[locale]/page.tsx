import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-16 text-center">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>

      <div>
        <h1 className="text-3xl font-bold">{tCommon("appName")}</h1>
        <p className="mt-4 text-xl font-semibold">{t("title")}</p>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/signup"
          className="rounded-md bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700"
        >
          {t("signupCta")}
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100"
        >
          {t("loginCta")}
        </Link>
      </div>

      <Link href="/download" className="text-sm underline">
        {t("androidAppCta")}
      </Link>
    </main>
  );
}
