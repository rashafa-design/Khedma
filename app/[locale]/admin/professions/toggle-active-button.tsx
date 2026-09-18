"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function ToggleActiveButton({
  table,
  id,
  isActive,
}: {
  table: "professions" | "task_types";
  id: string;
  isActive: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    await supabase.from(table).update({ is_active: !isActive }).eq("id", id);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
    >
      {isActive ? t("deactivate") : t("activate")}
    </button>
  );
}
