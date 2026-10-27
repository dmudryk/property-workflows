"use client";

import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// disabled — пункт видно, але вибрати його не можна; note — пояснення поруч із назвою (наприклад, AC-EDITOR-10).
export type FormSelectItem = { value: string | null; label: string; disabled?: boolean; note?: string };

// Випадний список у вигляді дизайн-системи (DESIGN.md, розділ 5) замість системного <select>. Значення йде у форму
// прихованим полем name; пункт зі значенням null надсилає порожній рядок (наприклад, «Me (run manager)»).
// value задано (null — нічого не вибрано) — список керований; інакше — некерований із defaultValue, і defaultValue
// після першого показу не змінюють (Base UI попереджає про зміну початкового значення некерованого Select).
export function FormSelect({
  id,
  name,
  items,
  value,
  defaultValue = null,
  placeholder,
  disabled,
  size,
  className,
  onValueChange,
}: {
  id: string;
  name?: string;
  items: FormSelectItem[];
  value?: string | null;
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  size?: React.ComponentProps<typeof SelectTrigger>["size"];
  className?: string;
  onValueChange?: (value: string | null) => void;
}) {
  return (
    <Select
      id={id}
      name={name}
      items={items}
      {...(value === undefined ? { defaultValue } : { value })}
      disabled={disabled}
      onValueChange={(value) => onValueChange?.(value)}
    >
      <SelectTrigger size={size} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem
            key={item.value ?? ""}
            value={item.value}
            disabled={item.disabled}
            // Недоступний пункт з поясненням лишається читабельним: приглушений колір замість прозорості.
            className={item.disabled ? "text-muted-foreground data-disabled:opacity-100" : undefined}
          >
            {item.label}
            {item.note ? <span className="text-muted-foreground">· {item.note}</span> : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
