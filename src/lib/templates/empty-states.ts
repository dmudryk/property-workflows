// Порожні списки шаблонів і версій (DESIGN.md, розділ 6): текст і посилання на наступну дію замість порожньої таблиці.
// Тексти — дослівно з AC PM.
export const MSG_NO_TEMPLATES_ADMIN = "No templates yet. Create a template to start."; // припущення PM до AC-EDITOR-17
export const LINK_CREATE_TEMPLATE = "Create a template";
export const MSG_NO_TEMPLATES_MANAGER = "No templates yet. An administrator creates them."; // AC-EDITOR-17
export const MSG_NO_VERSIONS = "No versions yet. Save the template to create version 1."; // AC-EDITOR-18

// Адміністратор може створити шаблон — йому посилання; менеджер лише чекає на шаблони адміністратора.
export function templatesEmptyState(admin: boolean): { message: string; action?: { href: string; label: string } } {
  return admin
    ? { message: MSG_NO_TEMPLATES_ADMIN, action: { href: "/templates/new", label: LINK_CREATE_TEMPLATE } }
    : { message: MSG_NO_TEMPLATES_MANAGER };
}
