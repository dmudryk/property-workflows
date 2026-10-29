import { basename } from "node:path";
import { defineConfig } from "vitest/config";

// Статичний імпорт картинки (import hero from "./login-hero.jpg"): Next.js дає об'єкт із розмірами й blurDataURL, а
// Vite — лише рядок-шлях, і next/image з placeholder="blur" падає. Плагін віддає об'єкт того самого вигляду, що й
// завантажувач картинок Next.js, — замість vi.mock картинки в кожному тесті. Розміри умовні: картинки сторінок — з fill.
const nextStaticImage = {
  name: "next-static-image",
  enforce: "pre" as const,
  load(id: string) {
    const file = id.split("?")[0];
    if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(file)) return null;
    const image = { src: `/${basename(file)}`, width: 1200, height: 1490, blurDataURL: "data:image/jpeg;base64,AA==" };
    return `export default ${JSON.stringify(image)};`;
  },
};

export default defineConfig({
  plugins: [nextStaticImage],
  // Vite 8: аліас @/* з tsconfig.json без окремого плагіна.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Тест без жодної перевірки (порожній it("AC-…", () => {})) падає: ac:coverage рахує тест, тож він має щось перевіряти.
    // Рахуються лише expect(…); assert із vitest чи node:assert — ні (такий тест теж падає).
    expect: { requireAssertions: true },
    // Лише *.test.ts(x): ac:coverage рахує тести тільки з цих файлів (*.spec.ts тут не запускається).
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    // tests/fixtures — дані для тестів скриптів; файли *.test.ts там НЕ запускаються.
    exclude: ["node_modules/**", "tests/fixtures/**"],
  },
});
