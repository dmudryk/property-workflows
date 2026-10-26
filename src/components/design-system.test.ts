import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";
import { LAUNCH_HREF, LINK_LAUNCH_TEMPLATE, MSG_NO_RUNS, runsListView } from "@/lib/runs/list-view";
import { runStatusKind } from "@/lib/status";
import { AppShell } from "./app-shell";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";

// Стани дизайн-системи (openspec/specs/design-system): спільні компоненти, які беруть усі сторінки.
describe("design-system", () => {
  it("AC-DSYS-01: «in progress» — синій, «completed» — зелений, слово завжди поруч із кольором, однаково в списку й на сторінці запуску", () => {
    // Список і сторінка запуску беруть вид бейджа з тієї самої функції й рендерять той самий StatusBadge.
    expect(runStatusKind("in_progress")).toBe("in_progress");
    expect(runStatusKind("completed")).toBe("completed");

    const inProgress = renderToStaticMarkup(createElement(StatusBadge, { kind: runStatusKind("in_progress") }));
    const completed = renderToStaticMarkup(createElement(StatusBadge, { kind: runStatusKind("completed") }));
    // Колір і слово — в одному елементі бейджа.
    expect(inProgress).toMatch(/<span[^>]*class="[^"]*bg-status-progress[^"]*"[^>]*>in progress<\/span>/);
    expect(completed).toMatch(/<span[^>]*class="[^"]*bg-status-done[^"]*"[^>]*>completed<\/span>/);
  });

  it("AC-DSYS-03: сторінка входу — у тій самій розкладці (AppShell), без даних користувача; сторінка запуску не публічна", () => {
    expect(isPublicPath("/runs/acde19d4-83ed-432b-a9e0-c75e12ab2d1e")).toBe(false); // proxy веде на /login
    const login = renderToStaticMarkup(
      createElement(AppShell, null, createElement("main", null, createElement("h1", null, "Sign in"))),
    );
    expect(login).toContain("Property Workflows");
    expect(login).toContain("Sign in");
    expect(login).not.toContain("Sign out");
    expect(login).not.toContain('data-testid="user-email"');
  });

  it("AC-DSYS-04: без запусків — «No runs yet. Launch a template to start one.» і «Launch a template», без таблиці", () => {
    expect(runsListView(0)).toBe("empty");
    expect(runsListView(2)).toBe("table");
    const html = renderToStaticMarkup(
      createElement(EmptyState, { message: MSG_NO_RUNS, action: { href: LAUNCH_HREF, label: LINK_LAUNCH_TEMPLATE } }),
    );
    expect(html).toContain("No runs yet. Launch a template to start one.");
    expect(html).toMatch(/<a[^>]*href="\/runs\/new"[^>]*>Launch a template<\/a>/);
    expect(html).not.toContain("<table");
  });
});
