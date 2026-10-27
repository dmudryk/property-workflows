// Зміст шаблону — секції із задачами (design.md impl-ws7-templates, R1). Ті самі ключі нормалізує база
// (private.normalize_template_content); тут — чисті операції редактора (U2) і правила, які показує сторінка.

export type TemplateTask = { id: string; name: string; required: boolean };
export type TemplateSection = { id: string; name: string; tasks: TemplateTask[] };
// name — назва шаблону в незбережених змінах і у версії (AC-EDITOR-21); немає — поточна назва шаблону.
export type TemplateContent = { name?: string; sections: TemplateSection[] };

export const EMPTY_CONTENT: TemplateContent = { sections: [] };

// Тексти — дослівно з AC PM.
export const MSG_NO_REQUIRED_TASK = "A template needs at least one required task"; // AC-EDITOR-04
export const MSG_NOT_ENOUGH_RIGHTS = "Not enough rights"; // AC-EDITOR-07, AC-DSYS-02
export const MSG_BACK_TO_TEMPLATES = "Back to templates"; // AC-DSYS-02
export const MSG_EMPTY_TEMPLATE_NAME = "Enter a template name"; // AC-EDITOR-19
export const MSG_EMPTY_NAME = "Every section and task needs a name"; // AC-EDITOR-20
export const MSG_EMPTY_SECTION = "Every section needs at least one task"; // AC-EDITOR-15
export const MSG_NAME_TAKEN = "A template with this name already exists"; // AC-EDITOR-23, AC-EDITOR-24
export const MSG_CHANGE_NOT_KEPT = "Your last change was not kept. Try again."; // AC-EDITOR-25
export const MSG_ALL_CHANGES_KEPT = "All changes kept"; // припущення PM до AC-EDITOR-25

export function countTasks(content: TemplateContent): number {
  return content.sections.reduce((sum, section) => sum + section.tasks.length, 0);
}

// Підсумок змісту для чипів на сторінках шаблону й запуску: «2 sections», «5 tasks», «3 required · 2 optional».
export function summarizeContent(content: TemplateContent): {
  sections: number;
  sectionNames: string[];
  tasks: number;
  required: number;
  optional: number;
} {
  const tasks = content.sections.flatMap((section) => section.tasks);
  const required = tasks.filter((task) => task.required).length;
  return {
    sections: content.sections.length,
    sectionNames: content.sections.map((section) => section.name),
    tasks: tasks.length,
    required,
    optional: tasks.length - required,
  };
}

// AC-EDITOR-04: версію можна зберегти, лише якщо є хоча б одна обов'язкова задача.
export function hasRequiredTask(content: TemplateContent): boolean {
  return content.sections.some((section) => section.tasks.some((task) => task.required));
}

export function addSection(content: TemplateContent, section: TemplateSection): TemplateContent {
  return { ...content, sections: [...content.sections, section] };
}

export function addTask(content: TemplateContent, sectionId: string, task: TemplateTask): TemplateContent {
  return {
    ...content,
    sections: content.sections.map((s) => (s.id === sectionId ? { ...s, tasks: [...s.tasks, task] } : s)),
  };
}

// Назви обрізаються; порожня назва — теж незбережена зміна: її відхиляє збереження версії, а не редактор
// (AC-EDITOR-19, AC-EDITOR-20).
export function renameTemplate(content: TemplateContent, name: string): TemplateContent {
  return { ...content, name: name.trim() };
}

export function renameSection(content: TemplateContent, sectionId: string, name: string): TemplateContent {
  const trimmed = name.trim();
  return { ...content, sections: content.sections.map((s) => (s.id === sectionId ? { ...s, name: trimmed } : s)) };
}

export function renameTask(content: TemplateContent, taskId: string, name: string): TemplateContent {
  const trimmed = name.trim();
  return mapTasks(content, (t) => (t.id === taskId ? { ...t, name: trimmed } : t));
}

export function toggleRequired(content: TemplateContent, taskId: string): TemplateContent {
  return mapTasks(content, (t) => (t.id === taskId ? { ...t, required: !t.required } : t));
}

// AC-EDITOR-13, AC-EDITOR-14: видалення — лише після підтвердження (діалог редактора); тут — уже підтверджене.
export function removeSection(content: TemplateContent, sectionId: string): TemplateContent {
  return { ...content, sections: content.sections.filter((s) => s.id !== sectionId) };
}

export function removeTask(content: TemplateContent, taskId: string): TemplateContent {
  return {
    ...content,
    sections: content.sections.map((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) })),
  };
}

export function moveSection(content: TemplateContent, sectionId: string, direction: -1 | 1): TemplateContent {
  const from = content.sections.findIndex((s) => s.id === sectionId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= content.sections.length) return content;
  const sections = [...content.sections];
  [sections[from], sections[to]] = [sections[to], sections[from]];
  return { ...content, sections };
}

// Задача рухається в межах секції; з краю секції — у сусідню секцію (наприклад, у кінець попередньої; AC-EDITOR-28).
export function moveTask(content: TemplateContent, taskId: string, direction: -1 | 1): TemplateContent {
  const si = content.sections.findIndex((s) => s.tasks.some((t) => t.id === taskId));
  if (si < 0) return content;
  const sections = content.sections.map((s) => ({ ...s, tasks: [...s.tasks] }));
  const tasks = sections[si].tasks;
  const ti = tasks.findIndex((t) => t.id === taskId);
  const target = ti + direction;
  if (target >= 0 && target < tasks.length) {
    [tasks[ti], tasks[target]] = [tasks[target], tasks[ti]];
    return { ...content, sections };
  }
  const neighbour = sections[si + direction];
  if (!neighbour) return content;
  const [task] = tasks.splice(ti, 1);
  if (direction === -1) neighbour.tasks.push(task);
  else neighbour.tasks.unshift(task);
  return { ...content, sections };
}

function mapTasks(content: TemplateContent, fn: (task: TemplateTask) => TemplateTask): TemplateContent {
  return { ...content, sections: content.sections.map((s) => ({ ...s, tasks: s.tasks.map(fn) })) };
}

// Зміст із бази чи з форми — лише відомі ключі й типи; інакше null (дія відмовляє без запису).
export function parseContent(value: unknown): TemplateContent | null {
  if (!isObject(value) || !Array.isArray(value.sections)) return null;
  if (value.name !== undefined && typeof value.name !== "string") return null;
  const sections: TemplateSection[] = [];
  for (const s of value.sections) {
    if (!isObject(s) || typeof s.id !== "string" || typeof s.name !== "string" || !Array.isArray(s.tasks)) return null;
    const tasks: TemplateTask[] = [];
    for (const t of s.tasks) {
      if (!isObject(t) || typeof t.id !== "string" || typeof t.name !== "string" || typeof t.required !== "boolean") {
        return null;
      }
      tasks.push({ id: t.id, name: t.name, required: t.required });
    }
    sections.push({ id: s.id, name: s.name, tasks });
  }
  return typeof value.name === "string" ? { name: value.name, sections } : { sections };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
