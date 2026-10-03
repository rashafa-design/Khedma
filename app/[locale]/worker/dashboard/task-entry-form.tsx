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

type Row = {
  id: number;
  taskTypeId: string;
  scope: TaskScope;
  price: string;
  billingUnit: BillingUnit;
};

// Add one or several things the worker offers in a single go: fill a row,
// press "Add another" for more, then save them all together.
export function TaskEntryForm({
  workerProfileId,
  taskTypes,
  professions,
  nameKey,
  worksByVisits,
}: {
  workerProfileId: string;
  taskTypes: TaskTypeRow[];
  professions: ProfessionRow[];
  nameKey: "name_en" | "name_ar";
  worksByVisits: boolean;
}) {
  const t = useTranslations("worker");
  const router = useRouter();
  const supabase = createClient();

  const blankRow = (id: number): Row => ({
    id,
    taskTypeId: taskTypes[0]?.id ?? "",
    scope: "both",
    price: "",
    billingUnit: "hourly",
  });

  const [rows, setRows] = useState<Row[]>([blankRow(1)]);
  const [nextId, setNextId] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(id: number, change: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...change } : row))
    );
  }

  function addRow() {
    setRows((current) => [...current, blankRow(nextId)]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // One request for every row: either they all save or none do.
    const { error: insertError } = await supabase
      .from("worker_task_entries")
      .insert(
        rows.map((row) => ({
          worker_profile_id: workerProfileId,
          task_type_id: row.taskTypeId,
          scope: row.scope,
          price: Number(row.price),
          billing_unit: row.billingUnit,
        }))
      );

    setSubmitting(false);

    if (insertError) {
      setError(t("error"));
      return;
    }

    setRows([blankRow(nextId)]);
    setNextId((n) => n + 1);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-gray-200 p-4"
    >
      <h2 className="font-semibold">{t("addTaskEntryTitle")}</h2>
      <p className="text-sm text-gray-600">{t("addManyHint")}</p>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("rowNumber", { n: index + 1 })}
            </p>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs font-medium text-red-700 underline"
              >
                {t("removeRow")}
              </button>
            )}
          </div>

          <select
            value={row.taskTypeId}
            onChange={(e) => update(row.id, { taskTypeId: e.target.value })}
            className="rounded-md border border-gray-300 bg-white px-3 py-2"
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
            value={row.scope}
            onChange={(e) =>
              update(row.id, { scope: e.target.value as TaskScope })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2"
          >
            <option value="home">{t("scopeHome")}</option>
            <option value="business">{t("scopeBusiness")}</option>
            <option value="both">{t("scopeBoth")}</option>
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              required
              min={1}
              step={0.01}
              placeholder={t("price")}
              value={row.price}
              onChange={(e) => update(row.id, { price: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2"
            />
            <select
              value={row.billingUnit}
              onChange={(e) =>
                update(row.id, { billingUnit: e.target.value as BillingUnit })
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
            >
              <option value="hourly">{t("billingHourly")}</option>
              <option value="daily">{t("billingDaily")}</option>
              <option value="monthly">{t("billingMonthly")}</option>
            </select>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-500">
        {t("scopeHint")} {t("priceHint")}
      </p>
      {worksByVisits && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
          {t("priceWithoutTransport")}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-gray-400 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100"
        >
          + {t("addAnotherRow")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? t("submitting") : t("saveAll", { count: rows.length })}
        </button>
      </div>
    </form>
  );
}
