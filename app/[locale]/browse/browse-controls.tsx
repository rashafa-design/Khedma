"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { governorateOptions } from "@/lib/governorates";
import { nationalityOptions } from "@/lib/nationalities";
import type { ProfessionRow } from "@/lib/types";

export function BrowseControls({
  professions,
  nameKey,
  showSeenFilter,
}: {
  professions: ProfessionRow[];
  nameKey: "name_en" | "name_ar";
  showSeenFilter: boolean;
}) {
  const t = useTranslations("browse");
  const locale = useLocale();
  const nationalities = nationalityOptions(locale);
  const governorates = governorateOptions(locale);
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

  const currentType = searchParams.get("type") ?? "";
  const typeTabs = [
    { value: "", label: t("typeAll") },
    { value: "monthly", label: `📅 ${t("typeMonthly")}` },
    { value: "visits", label: `🔧 ${t("typeVisits")}` },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        className="grid grid-cols-3 gap-1 rounded-lg bg-gray-200 p-1 text-sm font-medium"
      >
        {typeTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={currentType === tab.value}
            onClick={() => updateParam("type", tab.value)}
            className={`rounded-md px-2 py-2 ${
              currentType === tab.value
                ? "bg-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600">
        {currentType === "monthly"
          ? t("typeMonthlyHint")
          : currentType === "visits"
            ? t("typeVisitsHint")
            : t("typeAllHint")}
      </p>
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
        value={searchParams.get("area") ?? ""}
        onChange={(e) => updateParam("area", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">{t("allAreas")}</option>
        {governorates.map((g) => (
          <option key={g.code} value={g.code}>
            {g.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("nationality") ?? ""}
        onChange={(e) => updateParam("nationality", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">{t("allNationalities")}</option>
        {nationalities.map((n) => (
          <option key={n.code} value={n.code}>
            {n.label}
          </option>
        ))}
      </select>

      {showSeenFilter && (
        <select
          value={searchParams.get("seen") ?? ""}
          onChange={(e) => updateParam("seen", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{t("seenAll")}</option>
          <option value="new">{t("seenNew")}</option>
          <option value="viewed">{t("seenViewed")}</option>
          <option value="unlocked">{t("seenUnlocked")}</option>
        </select>
      )}

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
    </div>
  );
}
