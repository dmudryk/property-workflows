import { describe, expect, it } from "vitest";
import { launchableTemplate, launchTemplateItems, NOTE_SAVE_TO_LAUNCH } from "./launch-items";

const TENANT_MOVE_IN = { id: "a1", name: "Tenant move-in", current_version: 1 };
const NEW_REPAIR = { id: "a9", name: "Repair", current_version: null };

describe("template-editor", () => {
  it("AC-EDITOR-10: адміністратор бачить незбережений «Repair» недоступним з «Save the template to launch it» і не може його вибрати", () => {
    // Адміністратору RLS віддає всі шаблони, зокрема незбережені.
    const items = launchTemplateItems([NEW_REPAIR, TENANT_MOVE_IN]);

    expect(items).toEqual([
      { value: "a9", label: "Repair", disabled: true, note: "Save the template to launch it" },
      { value: "a1", label: "Tenant move-in" },
    ]);
    expect(NOTE_SAVE_TO_LAUNCH).toBe("Save the template to launch it");
    // Вибрати не можна ні в списку (disabled), ні адресою ?template=: форма запуску його не відкриває.
    expect(launchableTemplate([NEW_REPAIR, TENANT_MOVE_IN], "a9")).toBeUndefined();
    expect(launchableTemplate([NEW_REPAIR, TENANT_MOVE_IN], "a1")).toBe(TENANT_MOVE_IN);
  });
});
