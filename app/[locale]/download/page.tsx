import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";

const APK_URL =
  "https://github.com/rashafa-design/Khedma/releases/latest/download/Khedma.apk";

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("download");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("subtitle")}</p>
      </div>

      <a
        href={APK_URL}
        className="rounded-md bg-gray-900 px-6 py-3 text-center font-medium text-white hover:bg-gray-700"
      >
        {t("downloadCta")}
      </a>

      <div>
        <h2 className="mb-2 font-semibold">{t("stepsTitle")}</h2>
        <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm text-gray-700">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
      </div>

      <p className="text-xs text-gray-500">{t("note")}</p>
    </main>
  );
}
