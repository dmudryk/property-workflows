import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Чип із підсумком (DESIGN.md, розділ 5): «5 tasks», «2 sections: …», «3 required · 2 optional». Не статус і не дія —
// нейтральна контурна позначка.
export function Chip({ className, ...props }: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="outline"
      className={cn("h-7 max-w-full truncate bg-background px-3 text-sm font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}
