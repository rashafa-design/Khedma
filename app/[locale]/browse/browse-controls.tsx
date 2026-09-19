"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ProfessionRow } from "@/lib/types";

export function BrowseControls({
  professions,
  nationalities,
  nameKey,
}: {
  professions: ProfessionRow[];
  nationalities: string[];
  nameKey: "name_en" | "name_ar";
}) {
  const t = useTranslations("browse");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={searchParams.get("profession") ?? ""}
        onChange={(e) => updateParam("profession", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">{t("allProfessions")}</option>
        {professions.map((profession) => (
          <option key={profession.id} value={profession.id}>
            {profession[nameKey]}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("scope") ?? ""}
        onChange={(e) => updateParam("scope", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">{t("anyScope")}</option>
        <option value="home">{t("scopeHome")}</option>
        <option value="business">{t("scopeBusiness")}</option>
      </select>

      <select
        value={searchParams.get("nationality") ?? ""}
        onChange={(e) => updateParam("nationality", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">{t("allNationalities")}</option>
        {nationalities.map((nationality) => (
          <option key={nationality} value={nationality}>
            {nationality}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("sort") ?? "newest"}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="newest">{t("sortNewest")}</option>
        <option value="price">{t("sortPrice")}</option>
        <option value="experience">{t("sortExperience")}</option>
      </select>
    </div>
  );
}
