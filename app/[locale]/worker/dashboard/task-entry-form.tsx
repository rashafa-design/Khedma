"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  BillingUnit,
  ProfessionRow,
  TaskScope,
  TaskTypeRow,
} from "@/lib/types";

export function TaskEntryForm({
  workerProfileId,
  taskTypes,
  professions,
  nameKey,
}: {
  workerProfileId: string;
  taskTypes: TaskTypeRow[];
  professions: ProfessionRow[];
  nameKey: "name_en" | "name_ar";
}) {
  const t = useTranslations("worker");
  const router = useRouter();
  const supabase = createClient();

  const [taskTypeId, setTaskTypeId] = useState(taskTypes[0]?.id ?? "");
  const [scope, setScope] = useState<TaskScope>("both");
  const [price, setPrice] = useState("");
  const [billingUnit, setBillingUnit] = useState<BillingUnit>("hourly");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: insertError } = await supabase
      .from("worker_task_entries")
      .insert({
        worker_profile_id: workerProfileId,
        task_type_id: taskTypeId,
        scope,
        price: Number(price),
        billing_unit: billingUnit,
      });

    setSubmitting(false);

    if (insertError) {
      setError(t("error"));
      return;
    }

    setPrice("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("addTaskEntryTitle")}</h2>

      <select
        value={taskTypeId}
        onChange={(e) => setTaskTypeId(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        {professions.map((profession) => {
          const tasks = taskTypes.filter(
            (taskType) => taskType.profession_id === profession.id
          );
          if (tasks.length === 0) return null;
          return (
            <optgroup key={profession.id} label={profession[nameKey]}>
              {tasks.map((taskType) => (
                <option key={taskType.id} value={taskType.id}>
                  {taskType[nameKey]}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      <select
        value={scope}
        onChange={(e) => setScope(e.target.value as TaskScope)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="home">{t("scopeHome")}</option>
        <option value="business">{t("scopeBusiness")}</option>
        <option value="both">{t("scopeBoth")}</option>
      </select>
      <p className="-mt-1 text-xs text-gray-500">{t("scopeHint")}</p>

      <input
        type="number"
        required
        min={1}
        step={0.01}
        placeholder={t("price")}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />

      <select
        value={billingUnit}
        onChange={(e) => setBillingUnit(e.target.value as BillingUnit)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="hourly">{t("billingHourly")}</option>
        <option value="daily">{t("billingDaily")}</option>
        <option value="monthly">{t("billingMonthly")}</option>
      </select>
      <p className="-mt-1 text-xs text-gray-500">{t("priceHint")}</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("add")}
      </button>
    </form>
  );
}
