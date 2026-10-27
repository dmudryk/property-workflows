import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeNextPath } from "@/lib/auth/next-path";
import { login } from "./actions";

// Вхід зі справжньою дією: клієнт Supabase замінено — signInWithPassword повертає `auth.error`.
const auth = vi.hoisted(() => ({ error: null as { message: string } | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: async () => ({ error: auth.error }) } }),
}));
// redirect() у Next.js кидає виняток і перериває дію — у тесті так само, з адресою в тексті.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const RUN = "/runs/acde19d4-83ed-432b-a9e0-c75e12ab2d1e"; // «Apartment 12, move-in»

function form(next?: string) {
  const data = new FormData();
  data.set("email", "manager.b@example.test");
  data.set("password", "synthetic-password");
  if (next !== undefined) data.set("next", next);
  return data;
}

beforeEach(() => {
  auth.error = null;
});

describe("design-system", () => {
  it("AC-DSYS-08: відвідувач відкрив запуск за прямим посиланням і увійшов як B — сторінка цього запуску", async () => {
    await expect(login(form(RUN))).rejects.toThrow(`REDIRECT ${RUN}`);
    // Хибний пароль — знову вхід, але адреса повернення не губиться.
    auth.error = { message: "Invalid login credentials" };
    await expect(login(form(RUN))).rejects.toThrow(`REDIRECT /login?error=invalid&next=${encodeURIComponent(RUN)}`);
  });

  it("AC-DSYS-08: повернення лише на сторінку цього застосунку — чужі адреси й сторінка входу ведуть на головну", async () => {
    expect(safeNextPath(RUN)).toBe(RUN);
    expect(safeNextPath("/runs?view=all")).toBe("/runs?view=all");
    for (const bad of ["//evil.example/x", "/\\evil.example", "https://evil.example", "runs", "/login", "/login?next=/runs", "/runs\n", null, 7]) {
      expect(safeNextPath(bad), String(bad)).toBeNull();
    }
    await expect(login(form("//evil.example/x"))).rejects.toThrow("REDIRECT /");
    await expect(login(form())).rejects.toThrow(/^REDIRECT \/$/);
  });
});
