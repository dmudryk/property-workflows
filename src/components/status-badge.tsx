import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusView, type StatusKind } from "@/lib/status";

// Бейдж статусу для всіх сторінок: крапка й слово кольором токена (DESIGN.md, розділ 5).
export function StatusBadge({ kind, className, ...props }: { kind: StatusKind } & React.ComponentProps<"span">) {
  const { label, tone } = statusView(kind);
  return (
    <Badge data-status={kind} className={cn("h-6 gap-1.5 px-2.5 text-sm", tone, className)} {...props}>
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
