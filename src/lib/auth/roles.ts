import type { Actor } from "@/lib/runs/rules";

// Створювати, редагувати, зберігати версію й бачити список версій — лише адміністратор (матриця прав;
// AC-EDITOR-07, AC-EDITOR-08, AC-DSYS-02). Ту саму перевірку робить і база (private.*_template*).
export function canManageTemplates(actor: Actor | null): boolean {
  return actor?.role === "admin";
}
