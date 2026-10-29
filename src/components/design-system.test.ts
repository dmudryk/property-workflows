import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import RunsPage from "@/app/runs/page";
import { LAUNCH_HREF, LINK_LAUNCH_TEMPLATE, MSG_NO_RUNS, runsListView } from "@/lib/runs/list-view";
import { runStatusKind } from "@/lib/status";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";

// Сторінка /runs читає запуски через requireActor(); у тесті — менеджер, якому RLS віддає лише рядки з `runs.rows`.
const runs = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("@/lib/auth/actor", () => ({
  requireActor: async () => ({
    supabase: { from: () => ({ select: async () => ({ data: runs.rows, error: null }) }) },
    actor: { id: "manager-b", role: "manager" },
    email: "manager.b@example.test",
  }),
}));

// Статичний імпорт картинки входу: у Next.js — об'єкт із розмірами й blurDataURL; Vitest дає лише шлях.
vi.mock("@/app/login/login-hero.jpg", () => ({
  default: { src: "/login-hero.jpg", width: 1200, height: 1490, blurDataURL: "data:image/jpeg;base64,AA==" },
}));

beforeEach(() => {
  runs.rows = [];
});

// Стани дизайн-системи (openspec/specs/design-system): спільні компоненти, які беруть усі сторінки.
describe("design-system", () => {
  it("AC-DSYS-01: «in progress» — синій, «completed» — зелений, слово завжди поруч із кольором, однаково в списку й на сторінці запуску", () => {
    // Список і сторінка запуску беруть вид бейджа з тієї самої функції й рендерять той самий StatusBadge.
    expect(runStatusKind("in_progress")).toBe("in_progress");
    expect(runStatusKind("completed")).toBe("completed");

    const inProgress = renderToStaticMarkup(createElement(StatusBadge, { kind: runStatusKind("in_progress") }));
    const completed = renderToStaticMarkup(createElement(StatusBadge, { kind: runStatusKind("completed") }));
    // Колір і слово — в одному елементі бейджа (перед словом — лише крапка того самого кольору, aria-hidden).
    const DOT = String.raw`(?:<span aria-hidden="true"[^>]*><\/span>)?`;
    expect(inProgress).toMatch(new RegExp(`<span[^>]*class="[^"]*bg-status-progress[^"]*"[^>]*>${DOT}in progress</span>`));
    expect(completed).toMatch(new RegExp(`<span[^>]*class="[^"]*bg-status-done[^"]*"[^>]*>${DOT}completed</span>`));
  });

  it("AC-DSYS-03: сторінка входу (src/app/login/page.tsx) — у тій самій розкладці AppShell, з формою входу й без даних", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain('data-testid="app-shell"');
    expect(html).toMatch(/<input[^>]*name="email"/);
    expect(html).toMatch(/<input[^>]*name="password"/);
    // Без даних користувача й запуску: ні email і ролі в шапці, ні виходу, ні прогресу чи менеджера запуску.
    expect(html).not.toContain('data-testid="user-email"');
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("Run manager");
    expect(html).not.toMatch(/\d+ of \d+ done/);
    // Перемикача теми на вході немає (ADR 0004): тема з cookie діє й тут.
    expect(html).not.toContain(">Theme</legend>");
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

  it("AC-DSYS-04: сторінка /runs менеджера без запусків — повідомлення й посилання «Launch a template», без таблиці", async () => {
    const html = renderToStaticMarkup(await RunsPage());
    expect(html).toContain(MSG_NO_RUNS);
    expect(html).toMatch(/<a[^>]*href="\/runs\/new"[^>]*>Launch a template<\/a>/);
    expect(html).toContain('data-testid="empty-state"');
    expect(html).not.toContain("<table");
  });

  it("сторінка /runs із запусками — таблиця без порожнього стану", async () => {
    runs.rows = [
      { id: "r1", case_name: "Apartment 12, move-in", template_name: "Tenant move-in", status: "in_progress", created_at: "2026-10-20T10:00:00Z", run_tasks: [{ status: "done" }, { status: "to_do" }] },
    ];
    const html = renderToStaticMarkup(await RunsPage());
    expect(html).toContain("<table");
    expect(html).toContain("Apartment 12, move-in");
    expect(html).toContain("1 of 2 done");
    expect(html).not.toContain(MSG_NO_RUNS);
  });
});
