import type { Actor } from "@/lib/runs/rules";

// Створювати, редагувати, зберігати версію й бачити список версій — лише адміністратор (матриця прав;
// AC-EDITOR-07, AC-EDITOR-08, AC-DSYS-02). Ту саму перевірку робить і база (private.*_template*).
export function canManageTemplates(actor: Actor | null): boolean {
  return actor?.role === "admin";
}

// Вендор — зовнішній підрядник: бачить лише свої задачі, шаблонів не бачить (AC-VENDOR-04, AC-VENDOR-08).
export function isVendor(actor: Actor | null): boolean {
  return actor?.role === "vendor";
}

// Запускати шаблон — менеджер і адміністратор; вендор — ні (матриця прав; база — private.launch_run, AC-VENDOR-09).
export function canLaunch(actor: Actor | null): boolean {
  return actor?.role === "manager" || actor?.role === "admin";
}
