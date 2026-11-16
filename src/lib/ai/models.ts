import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/lib/ai/models.ts (ADR 0006).
// Кандидати на 16.11.2026 (`npm run ai:models`: усі три є). Безкоштовні моделі з'являються й зникають:
// перед роботою запустіть `npm run ai:models` і перевірте ланцюжок живим прогоном `npm run eval`.
// Порядок = пріоритет. Лише ID із `:free`: платна модель у списку fallback оплачується за її ціною.
//   nemotron-3.5-super-vl     — строга схема (structured_outputs): перша, бо відповідь — JSON за схемою zod;
//   gemma-4-31b / gemma-4-26b — резерв; НЕ мають structured_outputs: json_schema може бути проігноровано,
//     тому поля повторено в промпті, а zod — ворота.
export const PRODUCT_MODELS = [
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
] as const;

// Суддя для живого eval — інша родина, ніж основна модель продукту (не оцінює відповіді своєї родини).
// Якщо відповідь дала резервна Gemma, суддя тієї ж родини: колонка modelId у звіті це показує.
export const JUDGE_MODEL = "google/gemma-4-31b-it:free";

// Фабрики приймають ключ параметром і НЕ читають process.env: так їх можна імпортувати в eval-скрипті.
// У коді застосунку модель бере лише src/lib/ai/openrouter.ts (server-only).
export function makeProductModel(apiKey: string | undefined) {
  const openrouter = createOpenRouter({ apiKey, appName: "Stepline document parsing" });
  return openrouter.chat(PRODUCT_MODELS[0], {
    // OpenRouter пробує наступну модель при помилці, ліміті постачальника або простої.
    // Платформний ліміт безкоштовних моделей (20/хв, 50/день на акаунт) ланцюжок НЕ обходить.
    models: [...PRODUCT_MODELS],
    // Портативний параметр `reasoning` з AI SDK 7 цей провайдер не передає — лише його власний.
    reasoning: { effort: "low", exclude: true },
  });
}

export function makeJudgeModel(apiKey: string | undefined) {
  const openrouter = createOpenRouter({ apiKey, appName: "Stepline document parsing eval" });
  return openrouter.chat(JUDGE_MODEL);
}
