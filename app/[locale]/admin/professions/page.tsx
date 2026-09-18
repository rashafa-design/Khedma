import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfessionRow, TaskTypeRow } from "@/lib/types";
import { AddProfessionForm } from "./add-profession-form";
import { AddTaskTypeForm } from "./add-task-type-form";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function AdminProfessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [{ data: professions }, { data: taskTypes }] = await Promise.all([
    supabase
      .from("professions")
      .select("*")
      .order("created_at")
      .returns<ProfessionRow[]>(),
    supabase
      .from("task_types")
      .select("*")
      .order("created_at")
      .returns<TaskTypeRow[]>(),
  ]);

  const t = await getTranslations("admin");
  const nameKey = locale === "ar" ? "name_ar" : "name_en";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-6">
        {(professions ?? []).map((profession) => (
          <div
            key={profession.id}
            className="rounded-md border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {profession[nameKey]}
                {!profession.is_active && (
                  <span className="ms-2 rounded bg-gray-200 px-2 py-0.5 text-xs">
                    {t("inactive")}
                  </span>
                )}
              </p>
              <ToggleActiveButton
                table="professions"
                id={profession.id}
                isActive={profession.is_active}
              />
            </div>

            <ul className="mt-3 flex flex-col gap-2 ps-4">
              {(taskTypes ?? [])
                .filter((taskType) => taskType.profession_id === profession.id)
                .map((taskType) => (
                  <li
                    key={taskType.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {taskType[nameKey]}
                      {!taskType.is_active && (
                        <span className="ms-2 rounded bg-gray-200 px-2 py-0.5 text-xs">
                          {t("inactive")}
                        </span>
                      )}
                    </span>
                    <ToggleActiveButton
                      table="task_types"
                      id={taskType.id}
                      isActive={taskType.is_active}
                    />
                  </li>
                ))}
            </ul>
          </div>
        ))}

        {(professions ?? []).length === 0 && (
          <p className="text-sm text-gray-600">{t("noProfessions")}</p>
        )}
      </div>

      <AddProfessionForm />
      <AddTaskTypeForm professions={professions ?? []} nameKey={nameKey} />
    </main>
  );
}
