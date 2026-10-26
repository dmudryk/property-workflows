import { describe, expect, it } from "vitest";
import { MSG_BACK_TO_TEMPLATES, MSG_NOT_ENOUGH_RIGHTS } from "@/lib/templates/content";
import { isPublicPath } from "./public-paths";
import { canManageTemplates } from "./roles";

// Сторінки редактора й списку версій спершу перевіряють роль (canManageTemplates) і менеджеру показують
// «Not enough rights» без даних; без входу proxy веде на сторінку входу (isPublicPath).
describe("права на шаблони", () => {
  it("AC-EDITOR-07: менеджер — «Not enough rights» замість списку версій", () => {
    expect(canManageTemplates({ id: "b", role: "manager" })).toBe(false);
    expect(canManageTemplates({ id: "a", role: "admin" })).toBe(true);
    expect(MSG_NOT_ENOUGH_RIGHTS).toBe("Not enough rights");
  });

  it("AC-DSYS-02: менеджер на редакторі — «Not enough rights» і «Back to templates»", () => {
    expect(canManageTemplates({ id: "b", role: "manager" })).toBe(false);
    expect(canManageTemplates(null)).toBe(false);
    expect([MSG_NOT_ENOUGH_RIGHTS, MSG_BACK_TO_TEMPLATES]).toEqual(["Not enough rights", "Back to templates"]);
  });

  it("AC-EDITOR-09: редактор не публічний — відвідувача без входу веде на сторінку входу", () => {
    expect(isPublicPath("/templates/a1000000-0000-4000-8000-000000000001/edit")).toBe(false);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
