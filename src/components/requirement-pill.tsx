import { Badge } from "@/components/ui/badge";

// Обов'язковість задачі шаблону (DESIGN.md, розділ 5): «Required» — заповнена secondary, «Optional» — контурна.
// Помаранчевий тут не використовуємо: він лише для основної дії екрана («Вигляд і тон» PM).
export function RequirementPill({ required }: { required: boolean }) {
  return required ? (
    <Badge variant="secondary" className="h-6 px-2.5 text-sm">
      Required
    </Badge>
  ) : (
    <Badge variant="outline" className="h-6 bg-background px-2.5 text-sm text-muted-foreground">
      Optional
    </Badge>
  );
}
