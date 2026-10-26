"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";

// Вибір шаблону для запуску: одразу відкриває його задачі (?template=…), поки сторінка вантажиться — індикатор.
// Список керований: значення — вибраний шаблон зі сторінки (null — ще не вибрано); поки триває перехід, список уже
// показує новий вибір (useOptimistic), а після переходу — знову значення сторінки.
export function TemplatePicker({
  templates,
  selectedId,
}: {
  templates: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic<string | null>(selectedId || null);

  return (
    <div className="flex flex-col gap-2">
      {/* Видимий підпис — заголовок картки «Template» над списком. */}
      <Label htmlFor="template" className="sr-only">
        Template
      </Label>
      <FormSelect
        id="template"
        items={templates.map((t) => ({ value: t.id, label: t.name }))}
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
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
            Loading tasks…
          </>
        ) : null}
      </p>
    </div>
  );
}
