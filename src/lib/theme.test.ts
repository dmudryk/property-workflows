import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { ThemeProvider, ThemeSelect } from "@/components/theme-select";
import { THEME_MAX_AGE, themeCookie, themeFromCookie } from "./theme";

// RootLayout читає cookie теми (next/headers) і підключає шрифти (next/font) — у тесті їх замінено.
const jar = vi.hoisted(() => ({ theme: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "theme" && jar.theme ? { name, value: jar.theme } : undefined) }),
}));
vi.mock("../app/globals.css", () => ({})); // стилі тут читає readFileSync, а не збирає Tailwind
vi.mock("next/font/google", () => ({
  Poppins: () => ({ variable: "font-poppins" }),
  JetBrains_Mono: () => ({ variable: "font-jetbrains-mono" }),
}));

beforeEach(() => {
  jar.theme = undefined;
});

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// Блок змінних CSS за селектором (перший збіг): { "--status-done": "oklch(…)", … }.
function tokens(selector: string, source = css): Record<string, string> {
  const start = source.indexOf(`${selector} {`);
  expect(start, `немає блоку ${selector}`).toBeGreaterThanOrEqual(0);
  const body = source.slice(start, source.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const darkMedia = () => {
  const start = css.indexOf("@media (prefers-color-scheme: dark)");
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start);
};

async function renderLayout() {
  return renderToStaticMarkup(await RootLayout({ children: createElement("main"), params: Promise.resolve({}) } as never));
}

// Підпис вибраного значення у випадному списку «Theme».
function selectedTheme(html: string): string | undefined {
  return html.match(/<button[^>]*id="theme"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/)?.[1];
}

// OKLCH → лінійний sRGB → відносна яскравість і контраст WCAG 2.x.
function luminance(oklch: string): number {
  const [L, C, H] = oklch.match(/oklch\(([^)]+)\)/)![1].split(/\s+/).map(Number);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
const contrast = (x: string, y: string) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
const hue = (oklch: string) => Number(oklch.match(/oklch\(([^)]+)\)/)![1].split(/\s+/)[2]);

describe("design-system", () => {
  it("AC-DSYS-05: темний пристрій без вибору теми — темна тема, «Theme» показує «System»", async () => {
    expect(themeFromCookie(undefined)).toBe("system");
    expect(await renderLayout()).toMatch(/<html[^>]*data-theme="system"/);
    expect(selectedTheme(renderToStaticMarkup(createElement(ThemeSelect)))).toBe("System");

    // «System» на темному пристрої — ті самі темні токени, що й «Dark».
    const system = tokens(':root[data-theme="system"]', darkMedia());
    expect(system["--background"]).toBe(tokens(':root[data-theme="dark"]')["--background"]);
    expect(system).toEqual(tokens(':root[data-theme="dark"]'));
    expect(system["--background"]).not.toBe(tokens(":root")["--background"]);
    // Варіант dark: компонентів — за тією самою умовою.
    expect(css).toMatch(/@custom-variant dark \{[\s\S]*\[data-theme="dark"\][\s\S]*prefers-color-scheme: dark[\s\S]*\[data-theme="system"\]/);
  });

  it("AC-DSYS-06: вибір «Light» на темному пристрої — світла тема й після перезапуску браузера, «Theme» показує «Light»", async () => {
    // Вибір лишається на пристрої: стійке cookie на рік для всіх сторінок.
    expect(themeCookie("light")).toBe(`theme=light; Path=/; Max-Age=${THEME_MAX_AGE}; SameSite=Lax`);
    expect(THEME_MAX_AGE).toBe(31_536_000);

    // Після перезапуску браузер надсилає те саме cookie — сторінка знову світла.
    jar.theme = "light";
    for (let visit = 0; visit < 2; visit++) {
      expect(await renderLayout()).toMatch(/<html[^>]*data-theme="light"/);
    }
    expect(
      selectedTheme(renderToStaticMarkup(createElement(ThemeProvider, { theme: "light" }, createElement(ThemeSelect)))),
    ).toBe("Light");
    // Темні токени діють лише для «dark» і «system»; для «light» — лише світлі токени :root.
    expect([...css.matchAll(/:root\[data-theme="(\w+)"\]/g)].map((m) => m[1]).sort()).toEqual(["dark", "system"]);
    // Незнайоме значення cookie — «System».
    expect(themeFromCookie("sepia")).toBe("system");
  });

  it("AC-DSYS-07: у темній темі «in progress» — синій, «completed» — зелений, як у світлій, контраст тексту статусу ≥ 4.5:1", () => {
    const light = tokens(":root");
    const dark = tokens(':root[data-theme="dark"]');

    for (const status of ["progress", "done", "todo", "unpublished"]) {
      const ratio = contrast(dark[`--status-${status}-foreground`], dark[`--status-${status}`]);
      expect(ratio, `status-${status}`).toBeGreaterThanOrEqual(4.5);
    }
    // Той самий колір за змістом: відтінок у темній темі — як у світлій (синій ≈ 250°, зелений ≈ 150°).
    for (const [status, expected] of [
      ["progress", 250],
      ["done", 150],
    ] as const) {
      for (const theme of [light, dark]) {
        expect(Math.abs(hue(theme[`--status-${status}-foreground`]) - expected)).toBeLessThanOrEqual(15);
        expect(Math.abs(hue(theme[`--status-${status}`]) - expected)).toBeLessThanOrEqual(15);
      }
    }
  });
});
