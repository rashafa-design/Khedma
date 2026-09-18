"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    router.replace(pathname, { locale: next });
  }

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
    >
      {locale === "ar" ? t("english") : t("arabic")}
    </button>
  );
}
