import { MSG_CANNOT_UNDO } from "@/lib/runs/rules";
import { MSG_ALL_CHANGES_KEPT, removeSection, removeTask, type TemplateContent } from "./content";
import { TEMPLATE_ERRORS, type TemplateError } from "./errors";

// Стан редактора, який показує сторінка (impl-ws7-clarifications/design.md, U1): тексти — дослівно з AC PM.

export type SaveState = "idle" | "saving" | "saved" | "error";

// Одне фіксоване місце редактора: збережено чи ні (припущення PM до AC-EDITOR-25). Збій — повідомлення кольором
// помилки; правка лишається на екрані, бо зміст редактора не відкочується.
export function saveStatus(state: SaveState, error: TemplateError = "failed"): { text: string; isError: boolean } {
  if (state === "saving") return { text: "Saving…", isError: false };
  if (state === "error") return { text: TEMPLATE_ERRORS[error], isError: true };
  return { text: MSG_ALL_CHANGES_KEPT, isError: false };
}

// AC-EDITOR-03: повідомлення після збереження версії.
export function versionSavedMessage(version: number): string {
  return `Version ${version} saved`;
}

// AC-EDITOR-13, AC-EDITOR-14: видалення секції чи задачі — лише після підтвердження з її назвою й «This cannot be undone».
export type PendingRemove = { kind: "section" | "task"; id: string; name: string };

export function removeConfirmation(item: PendingRemove): { title: string; notice: string } {
  return { title: `Remove "${item.name}"?`, notice: MSG_CANNOT_UNDO };
}

// Скасування на підтвердженні нічого не змінює; підтвердження прибирає секцію (з її задачами) чи задачу.
export function resolveRemove(content: TemplateContent, item: PendingRemove, confirmed: boolean): TemplateContent {
  if (!confirmed) return content;
  return item.kind === "section" ? removeSection(content, item.id) : removeTask(content, item.id);
}
