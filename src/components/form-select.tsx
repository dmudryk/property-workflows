"use client";

import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FormSelectItem = { value: string | null; label: string };

// Випадний список у вигляді дизайн-системи (DESIGN.md, розділ 5) замість системного <select>. Значення йде у форму
// прихованим полем name; пункт зі значенням null надсилає порожній рядок (наприклад, «Me (run manager)»).
export function FormSelect({
  id,
  name,
  items,
  defaultValue = null,
  placeholder,
  disabled,
  className,
  onValueChange,
}: {
  id: string;
  name?: string;
  items: FormSelectItem[];
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string | null) => void;
}) {
  return (
    <Select
      id={id}
      name={name}
      items={items}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={(value) => onValueChange?.(value)}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value ?? ""} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
