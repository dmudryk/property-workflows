import { MSG_NO_REQUIRED_TASK, MSG_NOT_ENOUGH_RIGHTS } from "./content";

// Коди помилок дій шаблонів → тексти на сторінці. Тексти з AC — дослівно (AC-EDITOR-04, AC-EDITOR-07);
// решта — спокійні й без звинувачень (DESIGN.md, розділ 1).
export type TemplateError = "not_allowed" | "no_required_task" | "empty_name" | "invalid" | "not_found" | "failed";

export const TEMPLATE_ERRORS: Record<TemplateError, string> = {
  not_allowed: MSG_NOT_ENOUGH_RIGHTS,
  no_required_task: MSG_NO_REQUIRED_TASK,
  empty_name: "Enter a name",
  invalid: "The template could not be read. Reload the page and try again.",
  not_found: "Template not found",
  failed: "The last change was not kept. Try again.",
};

// Помилка функції бази (private.*_template*) → код для сторінки.
export function templateErrorCode(error: { code?: string; message?: string } | null | undefined): TemplateError {
  const message = error?.message ?? "";
  if (message.includes("NO_REQUIRED_TASK")) return "no_required_task";
  if (message.includes("NOT_ALLOWED") || error?.code === "42501") return "not_allowed";
  if (message.includes("EMPTY_NAME")) return "empty_name";
  if (message.includes("INVALID_CONTENT")) return "invalid";
  if (message.includes("TEMPLATE_NOT_FOUND")) return "not_found";
  return "failed";
}

// Лише власні ключі словника: ?error=__proto__ чи toString не повертає успадкованих значень.
export function templateErrorMessage(code: unknown): string | undefined {
  return typeof code === "string" && Object.hasOwn(TEMPLATE_ERRORS, code)
    ? TEMPLATE_ERRORS[code as TemplateError]
    : undefined;
}
