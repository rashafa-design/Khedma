"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

// The button names the language you will SWITCH TO, written in that language
// itself: on the Arabic page it says "English", on the English page it says
// "العربية". That way someone who can't read the current language can still
// find the way out.
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    router.replace(pathname, { locale: next });
  }

  const goingToArabic = locale !== "ar";

  return (
    <button
      onClick={toggle}
      lang={goingToArabic ? "ar" : "en"}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
    >
      {goingToArabic ? "العربية" : "English"}
    </button>
  );
}
