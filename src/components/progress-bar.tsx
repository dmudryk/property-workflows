import { cn } from "@/lib/utils";
import { STATUS_FILLS, type StatusKind } from "@/lib/status";

// Смуга прогресу (DESIGN.md, розділ 5): 8px, заповнення — колір статусу. Число завжди поруч текстом («2 of 5 done»),
// тож смуга лише для ока і прихована від читача екрана.
export function ProgressBar({ kind, percent, className }: { kind: StatusKind; percent: number; className?: string }) {
  return (
    <span aria-hidden className={cn("block h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <span className={cn("block h-full rounded-full", STATUS_FILLS[kind])} style={{ width: `${percent}%` }} />
    </span>
  );
}
