import { cn } from "@/lib/utils";

// Номер кроку, секції чи задачі в кружку (DESIGN.md, розділ 5). Порядок і так видно з розмітки (заголовки, списки),
// тож для читача екрана номер прихований.
export function NumberBadge({
  children,
  size = "default",
  className,
}: {
  children: React.ReactNode;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground tabular-nums",
        size === "sm" ? "size-7 text-sm" : "size-8 text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}
