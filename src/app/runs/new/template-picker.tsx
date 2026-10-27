"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, type TransitionStartFunction } from "react";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { launchTemplateItems, type LaunchTemplate } from "@/lib/runs/launch-items";

// Вибір шаблону для запуску: одразу відкриває його задачі (?template=…), поки сторінка вантажиться — індикатор.
// Незбережений шаблон адміністратор бачить недоступним з приміткою «Save the template to launch it» (AC-EDITOR-10).
// Список керований: значення — вибраний шаблон зі сторінки (null — ще не вибрано); поки триває перехід, список уже
// показує новий вибір (useOptimistic), а після переходу — знову значення сторінки. Перехід (pending, startTransition)
// належить формі запуску: поки він триває, форма ще має задачі й template_id попереднього шаблону, тож запуск вимкнено.
export function TemplatePicker({
  templates,
  selectedId,
  pending,
  startTransition,
}: {
  templates: LaunchTemplate[];
  selectedId: string;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const router = useRouter();
  const [value, setValue] = useOptimistic<string | null>(selectedId || null);

  return (
    <div className="flex flex-col gap-2">
      {/* Видимий підпис — заголовок картки «Template» над списком. */}
      <Label htmlFor="template" className="sr-only">
        Template
      </Label>
      <FormSelect
        id="template"
        items={launchTemplateItems(templates)}
        value={value}
        size="xl"
        placeholder="Choose a template"
        onValueChange={(next) => {
          if (!next) return;
          startTransition(() => {
            setValue(next);
            router.push(`/runs/new?template=${encodeURIComponent(next)}`);
          });
        }}
      />
      <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground empty:hidden">
        {pending ? (
          <>
            <Loader2Icon className="size-4 motion-safe:animate-spin" aria-hidden />
            Loading tasks…
          </>
        ) : null}
      </p>
    </div>
  );
}
