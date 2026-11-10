import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SidebarNav, navItemsFor } from "./sidebar-nav";

// Навігація і перша сторінка вендора (AC-VENDOR-13). usePathname і redirect — з Next.js, тут замокано: redirect, як і
// в Next.js, перериває виконання (виняток з адресою в тексті).
vi.mock("next/navigation", () => ({
  usePathname: () => "/runs",
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const links = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>[\s\S]*?([A-Za-z]+)<\/a>/g)].map((m) => [m[1], m[2]]);

describe("vendor-access: навігація", () => {
  it("AC-VENDOR-13: навігація вендора — лише «Runs» і «Profile»", () => {
    expect(navItemsFor("vendor").map((item) => item.label)).toEqual(["Runs", "Profile"]);

    const html = renderToStaticMarkup(<SidebarNav role="vendor" />);
    expect(links(html)).toEqual([
      ["/runs", "Runs"],
      ["/profile", "Profile"],
    ]);
    expect(html).not.toContain("Templates");
  });

  it("AC-VENDOR-13: після входу без адреси повернення — список запусків (/ → /runs)", () => {
    // Дія входу без next веде на «/» (src/app/login/actions.ts); головна сторінка — список запусків.
    expect(() => Home()).toThrow("REDIRECT /runs");
  });

  it("менеджер і адміністратор — «Runs», «Templates» і «Profile» (свій профіль бачить кожна роль)", () => {
    for (const role of ["manager", "admin"]) {
      expect(navItemsFor(role).map((item) => item.label), role).toEqual(["Runs", "Templates", "Profile"]);
    }
  });
});
