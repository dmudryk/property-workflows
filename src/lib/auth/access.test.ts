import { describe, expect, it } from "vitest";
import type { Actor } from "@/lib/runs/rules";
import { MSG_BACK_TO_TEMPLATES, MSG_NOT_ENOUGH_RIGHTS } from "@/lib/templates/content";
import { isPublicPath } from "./public-paths";
import { canLaunch, canManageTemplates, isVendor } from "./roles";

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

// Сторінка /runs/new і кнопка «Launch a template» на /runs питають canLaunch до будь-яких даних; список шаблонів і
// сторінки запусків питають isVendor (вендору — «Not enough rights» замість шаблонів і лише його задачі).
// Очікування — з матриці прав (requirements/product.md): «Launch a template» — manager «yes», admin «yes»,
// vendor «—»; «See templates» — vendor «—»; відвідувач без входу (null) бачить лише сторінку входу.
// Правило бази для тих самих AC доводить tests/db/vendor.test.ts (PGlite); тут — лише межа ролей на сторінках.
describe("права вендора й запуску", () => {
  const admin: Actor = { id: "a", role: "admin" };
  const managerA: Actor = { id: "b", role: "manager" };
  const vendorV: Actor = { id: "v", role: "vendor" };

  it("AC-RUN-05: адміністратор може запустити шаблон — сторінка запуску його пускає", () => {
    expect(canLaunch(admin)).toBe(true);
  });

  it("AC-RUN-06: менеджер може запустити шаблон — сторінка запуску його пускає", () => {
    expect(canLaunch(managerA)).toBe(true);
  });

  it("AC-VENDOR-09: вендор не запускає шаблон — відмова ще до читання даних", () => {
    expect(canLaunch(vendorV)).toBe(false);
  });

  it("AC-VENDOR-09: відвідувач без входу (null) шаблон не запускає", () => {
    expect(canLaunch(null)).toBe(false);
  });

  it("AC-VENDOR-08: вендор — «Not enough rights» замість списку шаблонів", () => {
    expect(isVendor(vendorV)).toBe(true);
    expect(MSG_NOT_ENOUGH_RIGHTS).toBe("Not enough rights");
  });

  it("AC-VENDOR-08: менеджер не вендор — список шаблонів без «Not enough rights»", () => {
    expect(isVendor(managerA)).toBe(false);
  });

  it("AC-VENDOR-08: адміністратор не вендор — список шаблонів без «Not enough rights»", () => {
    expect(isVendor(admin)).toBe(false);
  });

  it("AC-VENDOR-08: відвідувач без входу (null) не вендор", () => {
    expect(isVendor(null)).toBe(false);
  });
});
