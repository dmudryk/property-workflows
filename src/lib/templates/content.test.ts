import { describe, expect, it } from "vitest";
import {
  MSG_NO_REQUIRED_TASK,
  addTask,
  countTasks,
  hasRequiredTask,
  moveTask,
  parseContent,
  renameTask,
  renameTemplate,
  summarizeContent,
  type TemplateContent,
} from "./content";
import { TEMPLATE_ERRORS, templateErrorCode, templateErrorMessage } from "./errors";

const tenantMoveIn: TemplateContent = {
  sections: [
    {
      id: "s1",
      name: "Before move-in",
      tasks: [
        { id: "t1", name: "Sign the lease", required: true },
        { id: "t2", name: "Collect the deposit", required: true },
        { id: "t3", name: "Order cleaning", required: false },
      ],
    },
    {
      id: "s2",
      name: "Move-in day",
      tasks: [
        { id: "t4", name: "Hand over the keys", required: true },
        { id: "t5", name: "Read the meters", required: false },
      ],
    },
  ],
};

describe("шаблон: підсумок змісту для чипів", () => {
  it("рахує секції, задачі, обов'язкові й необов'язкові; назви секцій — по порядку", () => {
    expect(summarizeContent(tenantMoveIn)).toEqual({
      sections: 2,
      sectionNames: ["Before move-in", "Move-in day"],
      tasks: 5,
      required: 3,
      optional: 2,
    });
    expect(summarizeContent({ sections: [] })).toEqual({ sections: 0, sectionNames: [], tasks: 0, required: 0, optional: 0 });
  });
});

describe("template-editor: операції редактора", () => {
  it("AC-EDITOR-01: шоста задача «Sign handover act» у секції «Move-in day» — 6 задач", () => {
    const next = addTask(tenantMoveIn, "s2", { id: "t6", name: "Sign handover act", required: false });
    expect(countTasks(next)).toBe(6);
    expect(next.sections[1].tasks.at(-1)?.name).toBe("Sign handover act");
    expect(countTasks(tenantMoveIn)).toBe(5); // зміст версії не змінено
  });

  it("AC-EDITOR-04: 3 необов'язкові задачі — немає обов'язкової, повідомлення «A template needs at least one required task»", () => {
    const repair: TemplateContent = {
      sections: [
        {
          id: "s1",
          name: "Works",
          tasks: [
            { id: "a", name: "Inspect", required: false },
            { id: "b", name: "Fix", required: false },
            { id: "c", name: "Clean up", required: false },
          ],
        },
      ],
    };
    expect(hasRequiredTask(repair)).toBe(false);
    expect(hasRequiredTask(tenantMoveIn)).toBe(true);
    const code = templateErrorCode({ code: "22023", message: "NO_REQUIRED_TASK" });
    expect(code).toBe("no_required_task");
    expect(TEMPLATE_ERRORS[code]).toBe(MSG_NO_REQUIRED_TASK);
    expect(MSG_NO_REQUIRED_TASK).toBe("A template needs at least one required task");
  });

  it("задача з краю секції переходить у сусідню; назви обрізаються, порожня — теж незбережена зміна", () => {
    const moved = moveTask(tenantMoveIn, "t4", -1);
    expect(moved.sections[0].tasks.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(moved.sections[1].tasks.map((t) => t.id)).toEqual(["t5"]);
    // Порожню назву відхиляє збереження версії, а не редактор (AC-EDITOR-20).
    expect(renameTask(tenantMoveIn, "t1", "   ").sections[0].tasks[0].name).toBe("");
    expect(renameTask(tenantMoveIn, "t1", "  Sign the lease again ").sections[0].tasks[0].name).toBe(
      "Sign the lease again",
    );
    expect(renameTemplate(tenantMoveIn, " Tenant move-in (2026) ").name).toBe("Tenant move-in (2026)");
    expect(parseContent({ name: "Tenant move-in (2026)", sections: [] })).toEqual({ name: "Tenant move-in (2026)", sections: [] });
    expect(parseContent({ name: 7, sections: [] })).toBeNull();
  });

  it("зміст лише з відомих ключів і типів; інакше — null", () => {
    expect(parseContent(tenantMoveIn)).toEqual(tenantMoveIn);
    expect(parseContent({ sections: [{ id: "s", name: "S", tasks: [{ id: "t", name: "T", required: "yes" }] }] })).toBeNull();
    expect(parseContent(null)).toBeNull();
    expect(templateErrorMessage("__proto__")).toBeUndefined();
  });
});
