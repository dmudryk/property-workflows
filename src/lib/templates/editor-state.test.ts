import { describe, expect, it } from "vitest";
import { addTask, type TemplateContent } from "./content";
import { removeConfirmation, resolveRemove, saveStatus, versionSavedMessage } from "./editor-state";
import { templateErrorCode, templateErrorMessage } from "./errors";

const MOVE_IN_DAY = "s2";
const content: TemplateContent = {
  sections: [
    { id: "s1", name: "Before move-in", tasks: [{ id: "t1", name: "Sign the lease", required: true }] },
    {
      id: MOVE_IN_DAY,
      name: "Move-in day",
      tasks: [
        { id: "t2", name: "Hand over the keys", required: true },
        { id: "t3", name: "Read the meters", required: false },
        { id: "t4", name: "Take photos", required: false },
      ],
    },
  ],
};

describe("template-editor", () => {
  it("AC-EDITOR-03: повідомлення після збереження — «Version 2 saved»", () => {
    expect(versionSavedMessage(2)).toBe("Version 2 saved");
  });

  it("AC-EDITOR-13: видалення «Move-in day» — підтвердження з назвою й «This cannot be undone»; скасування лишає секцію і 3 задачі", () => {
    const item = { kind: "section" as const, id: MOVE_IN_DAY, name: "Move-in day" };

    const confirmation = removeConfirmation(item);
    expect(confirmation.title).toContain("Move-in day");
    expect(confirmation.notice).toBe("This cannot be undone");

    const afterCancel = resolveRemove(content, item, false);
    expect(afterCancel).toBe(content);
    expect(afterCancel.sections.find((s) => s.id === MOVE_IN_DAY)?.tasks).toHaveLength(3);

    // Підтвердження (AC-EDITOR-14) прибирає секцію разом із задачами.
    expect(resolveRemove(content, item, true).sections.map((s) => s.id)).toEqual(["s1"]);
  });

  it("AC-EDITOR-25: зміну не збережено — «Your last change was not kept. Try again.» кольором помилки; задача лишається на екрані", () => {
    // Правка вже в змісті редактора до збереження: збій не відкочує її.
    const withTask = addTask(content, MOVE_IN_DAY, { id: "t5", name: "Sign handover act", required: false });
    expect(withTask.sections[1].tasks.map((t) => t.name)).toContain("Sign handover act");

    // Збій мережі (fetch кинув виняток) і збій сервера — той самий текст у тому самому місці, з позначкою помилки.
    expect(saveStatus("error")).toEqual({ text: "Your last change was not kept. Try again.", isError: true });
    expect(saveStatus("error", templateErrorCode({ message: "fetch failed" }))).toEqual({
      text: "Your last change was not kept. Try again.",
      isError: true,
    });
    // Без збою те саме місце каже, що зміни збережено (припущення PM).
    expect(saveStatus("saved")).toEqual({ text: "All changes kept", isError: false });
    expect(saveStatus("idle")).toEqual({ text: "All changes kept", isError: false });
    expect(saveStatus("saving").isError).toBe(false);
  });

  it("тексти помилок збереження — дослівно з AC (AC-EDITOR-15, 20, 23, 24)", () => {
    expect(templateErrorMessage(templateErrorCode({ code: "22023", message: "EMPTY_SECTION" }))).toBe(
      "Every section needs at least one task",
    );
    expect(templateErrorMessage(templateErrorCode({ code: "22023", message: "EMPTY_NAME" }))).toBe(
      "Every section and task needs a name",
    );
    expect(templateErrorMessage(templateErrorCode({ code: "23505", message: "NAME_TAKEN" }))).toBe(
      "A template with this name already exists",
    );
    // Унікальний індекс (два одночасні створення) — той самий текст.
    expect(
      templateErrorMessage(templateErrorCode({ code: "23505", message: 'duplicate key value violates unique constraint "templates_name_key"' })),
    ).toBe("A template with this name already exists");
    expect(templateErrorMessage(templateErrorCode({ code: "22023", message: "EMPTY_TEMPLATE_NAME" }))).toBe(
      "Enter a template name",
    );
  });
});
