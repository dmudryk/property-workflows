// Шаблони у формі запуску (impl-ws7-clarifications/design.md, U3). Які шаблони видно, вирішує RLS: адміністратор —
// усі, менеджер — лише збережені. Шаблон, який ще ніколи не зберігали як версію, — недоступний пункт з приміткою
// (AC-EDITOR-10); запустити його не дасть і база (AC-EDITOR-11).
export const NOTE_SAVE_TO_LAUNCH = "Save the template to launch it"; // AC-EDITOR-10

export type LaunchTemplate = { id: string; name: string; current_version: number | null };

export function launchTemplateItems(
  templates: LaunchTemplate[],
): { value: string; label: string; disabled?: boolean; note?: string }[] {
  return templates.map((t) =>
    t.current_version === null
      ? { value: t.id, label: t.name, disabled: true, note: NOTE_SAVE_TO_LAUNCH }
      : { value: t.id, label: t.name },
  );
}

// Вибраний шаблон — лише збережений: ?template=<незбережений> форму запуску не відкриває.
export function launchableTemplate<T extends LaunchTemplate>(templates: T[], id: string): T | undefined {
  return templates.find((t) => t.id === id && t.current_version !== null);
}
