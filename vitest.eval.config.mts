import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/vitest.eval.config.mts; loadEnv з "vite"
// замінено вбудованим у Node 24 process.loadEnvFile (vite — лише транзитивна залежність vitest).
// `npm run eval` — живий прогін golden cases на безкоштовних моделях. Ніколи не частина `npm test` / CI:
// основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
if (existsSync(".env.local")) process.loadEnvFile(".env.local"); // .env.local → process.env лише для цього прогону

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    fileParallelism: false, // по одному запиту: безкоштовний тариф — 20 запитів/хв
    // Модель до 90 с (timeoutMs у прогоні) + суддя: 120 с не вистачало (16.11 GC-03 і GC-10 обірвано на 120 с).
    testTimeout: 240_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
});
