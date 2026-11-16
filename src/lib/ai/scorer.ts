import { Output, generateText, type LanguageModel } from "ai";
import { z } from "zod";
import type { Proposal } from "./document-rules";
import { JUDGE_INSTRUCTIONS, judgePrompt } from "./prompts/judge";

// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/lib/ai/scorer.ts (ADR 0006).

// Поля, які PM фіксує однозначно (solomchaak/property-workflows-spec#40). Порівнюються точно (масиви — за вмістом).
type ExactFields = Pick<Proposal, "status" | "kind" | "phone" | "category" | "urgency" | "lineItems" | "statedTotal" | "warnings" | "message">;

// Один golden case від PM: вхід → очікуване. Формат файлу — tests/fixtures/golden/cases.json.
export type GoldenCase = {
  id: string; // "GC-01"
  input: string;
  expected: Partial<ExactFields> & {
    notesInclude?: string[]; // дослівні нотатки, які має бути серед notes (їх додає код)
  };
  // Слова PM: що має / не має бути у вільному тексті (опис, нотатки). Оцінює LLM-суддя лише в живому eval.
  rubric?: string;
};

type Mismatch = { field: string; expected: unknown; actual: unknown };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// (1) Детермінована частина: точний збіг полів, зафіксованих PM у golden case.
export function scoreFields(expected: GoldenCase["expected"], actual: Proposal) {
  const { notesInclude, ...exact } = expected;
  const mismatches: Mismatch[] = (Object.keys(exact) as (keyof ExactFields)[])
    .filter((k) => !same(exact[k], actual[k]))
    .map((k) => ({ field: k, expected: exact[k], actual: actual[k] }));
  for (const note of notesInclude ?? []) {
    if (!actual.notes.includes(note)) mismatches.push({ field: "notes", expected: note, actual: actual.notes });
  }
  return { pass: mismatches.length === 0, mismatches };
}

// Вільний текст пропозиції для судді: опис і нотатки.
export function freeText(p: Proposal): string {
  return `Description: ${p.description ?? "(empty)"}\nNotes: ${p.notes.length ? p.notes.join(" | ") : "(none)"}`;
}

// (2) Нечітка частина: LLM-суддя лише для вільного тексту, двійковий вердикт із причиною.
const Verdict = z.object({ pass: z.boolean(), reason: z.string().max(300) });
export type JudgeVerdict = z.infer<typeof Verdict>;

export async function judgeSummary(judge: LanguageModel, rubric: string, summary: string): Promise<JudgeVerdict> {
  const { output } = await generateText({
    model: judge,
    instructions: JUDGE_INSTRUCTIONS,
    prompt: judgePrompt(rubric, summary),
    output: Output.object({ name: "verdict", schema: Verdict }),
    temperature: 0,
    maxRetries: 0, // повтор на безкоштовному тарифі витрачає той самий денний ліміт
  });
  return output;
}

// Частка успіху (pass rate) — визначення з WS8: прогін на задачах із відомими відповідями (ключ) → бал.
export function passRate(results: { pass: boolean }[]): { passed: number; total: number; rate: number } {
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, rate: results.length ? passed / results.length : 0 };
}
