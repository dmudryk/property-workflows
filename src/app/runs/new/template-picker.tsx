"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";

// Вибір шаблону для запуску: одразу відкриває його задачі (?template=…), поки сторінка вантажиться — індикатор.
export function TemplatePicker({
  templates,
  selectedId,
}: {
  templates: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="template">Template</Label>
      <FormSelect
        id="template"
        items={templates.map((t) => ({ value: t.id, label: t.name }))}
        defaultValue={selectedId || null}
        placeholder="Choose a template"
        onValueChange={(value) => {
          if (value) startTransition(() => router.push(`/runs/new?template=${encodeURIComponent(value)}`));
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
