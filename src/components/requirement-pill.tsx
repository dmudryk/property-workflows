import { Badge } from "@/components/ui/badge";
import { requiredLabel } from "@/lib/runs/rules";

// Обов'язковість задачі шаблону (DESIGN.md, розділ 5): «required» — заповнена secondary, «optional» — контурна.
// Слова — як у глосарії й AC-EDITOR-02 (і в запуску, AC-TASK-15). Помаранчевий тут не використовуємо: він лише для
// основної дії екрана («Вигляд і тон» PM).
export function RequirementPill({ required }: { required: boolean }) {
  return required ? (
    <Badge variant="secondary" data-testid="requirement" className="h-6 px-2.5 text-sm">
      {requiredLabel(true)}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      data-testid="requirement"
      className="h-6 bg-background px-2.5 text-sm text-muted-foreground"
    >
      {requiredLabel(false)}
    </Badge>
  );
}
