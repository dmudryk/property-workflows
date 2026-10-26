"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Сегментований перемикач (DESIGN.md, розділ 5): група кнопок 44px, вибрана — aria-pressed і тло accent. Фільтр
// статусу в списку запусків, «Required» / «Optional» у редакторі шаблону.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-lg border bg-background", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="xl"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="flex-1 gap-1.5 rounded-none px-2 text-muted-foreground sm:px-4 not-first:border-l-border first:rounded-l-lg last:rounded-r-lg aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:hover:bg-accent aria-pressed:text-accent-foreground"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
