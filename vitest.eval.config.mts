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
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
});
