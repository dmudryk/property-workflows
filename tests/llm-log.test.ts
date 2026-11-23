// Тест журналу AI-функції (WS11, трек B): рядок llm.call має потрібні поля і НІКОЛИ не містить тексту документа,
// промпту, відповіді моделі, e-mail, телефону, заголовків чи cookie — навіть якщо їх передали в зайвих полях або
// підсунули в дозволені. Плюс перевірка на рівні proposeDocument: справжній виклик (тестова модель без мережі) пише
// рівно один рядок llm.call — і на відповідь моделі, і на збій.
// Взято з koldovsky/2026-quitcode-11-devops-operations-hw materials/ops-kit/tests/llm-log.test.ts; приклади — з
// нашого продукту (заявка на ремонт, маршрут /runs/[id], модель і версія промпту зрізу 4), блок proposeDocument — наш.
// Назви тестів без AC ID: це технічна перевірка, а не критерій приймання (інакше ac:coverage покаже ORPHAN).
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proposeDocument } from "@/lib/ai/draft";
import { isFallback, logLlmCall, type LlmCall } from "@/lib/ai/llm-log";
import { PRODUCT_MODELS } from "@/lib/ai/models";
import { DRAFT_PROMPT_VERSION } from "@/lib/ai/prompts/draft";
import { formatEvent, pickAllowed } from "@/lib/log";

// Вигаданий «текст документа» з персональними даними. Жодна його частина не має опинитися в журналі.
const USER_TEXT =
  "Kitchen sink leaks under the cabinet, flat 12, call Olena at 555-0103 or olena.test@example.test, key under the mat";
const SECRET_MARKERS = ["Kitchen sink", "Olena", "555-0103", "olena.test", "@example.test", "key under", "Bearer", "sb-access-token"];

const base: LlmCall = {
  requestId: "3f0c2a9e-1b7d-4c55-9a3e-2f6d8e1c0b4a",
  route: "/runs/[id]",
  model: "nvidia/nemotron-3.5-super-vl:free",
  fallbackUsed: false,
  state: "ok",
  latencyMs: 1830.4,
  inputTokens: 612,
  outputTokens: 144,
  costUsd: 0,
  promptVersion: "docai-v2",
};

function expectNoUserText(line: string) {
  for (const marker of SECRET_MARKERS) expect(line).not.toContain(marker);
}

describe("llm.call", () => {
  let info: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("пише один рядок JSON з усіма полями виклику", () => {
    const line = logLlmCall(base);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(line);
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      event: "llm.call",
      requestId: base.requestId,
      route: "/runs/[id]",
      model: "nvidia/nemotron-3.5-super-vl:free",
      fallbackUsed: false,
      state: "ok",
      latencyMs: 1830,
      inputTokens: 612,
      outputTokens: 144,
      costUsd: 0,
      promptVersion: "docai-v2",
    });
    expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts);
  });

  it("стан unavailable пише рівнем error з кодом причини", () => {
    const line = logLlmCall({ ...base, state: "unavailable", errorKind: "rate_limited", inputTokens: undefined, outputTokens: undefined });
    expect(error).toHaveBeenCalledWith(line);
    expect(info).not.toHaveBeenCalled();
    const parsed = JSON.parse(line);
    expect(parsed.state).toBe("unavailable");
    expect(parsed.errorKind).toBe("rate_limited");
    expect(parsed).not.toHaveProperty("inputTokens");
  });

  it("зайві поля з текстом документа, промптом, відповіддю, заголовками й cookie не потрапляють у журнал", () => {
    // Не літерал, а змінна: TypeScript не забороняє зайві поля — саме так вони й просочуються в реальному коді.
    const sneaky = {
      ...base,
      text: USER_TEXT,
      prompt: `Instructions…\n<document>\n${USER_TEXT}\n</document>`,
      response: { description: USER_TEXT },
      messages: [{ role: "user", content: USER_TEXT }],
      email: "olena.test@example.test",
      phone: "555-0103",
      headers: { authorization: "Bearer test-token", cookie: "sb-access-token=test" },
      error: new Error(USER_TEXT),
    };
    const line = logLlmCall(sneaky);
    expectNoUserText(line);
    expect(Object.keys(JSON.parse(line)).sort()).toEqual(
      [
        "costUsd",
        "event",
        "fallbackUsed",
        "inputTokens",
        "latencyMs",
        "model",
        "outputTokens",
        "promptVersion",
        "requestId",
        "route",
        "state",
        "ts",
      ].sort(),
    );
  });

  it("текст документа, підсунутий у дозволені поля, відкидається за форматом", () => {
    const line = logLlmCall({
      ...base,
      requestId: USER_TEXT,
      route: `/runs/abc?note=${encodeURIComponent(USER_TEXT)}`,
      model: USER_TEXT,
      promptVersion: USER_TEXT,
      state: "unavailable",
      // Повідомлення про помилку може містити текст користувача — у журнал іде лише КОД причини.
      errorKind: `provider_error: ${USER_TEXT}`,
    });
    expectNoUserText(line);
    const parsed = JSON.parse(line);
    for (const key of ["requestId", "route", "model", "promptVersion", "errorKind"]) {
      expect(parsed).not.toHaveProperty(key);
    }
  });

  it("невідомий стан і некоректні числа не пишуться", () => {
    const line = logLlmCall({
      ...base,
      state: "done" as LlmCall["state"],
      latencyMs: Number.NaN,
      inputTokens: -5,
      costUsd: Number.POSITIVE_INFINITY,
    });
    const parsed = JSON.parse(line);
    expect(parsed).not.toHaveProperty("state");
    expect(parsed).not.toHaveProperty("latencyMs");
    expect(parsed).not.toHaveProperty("inputTokens");
    expect(parsed).not.toHaveProperty("costUsd");
  });

  it("довгий ідентифікатор обрізається до 120 символів", () => {
    const parsed = JSON.parse(logLlmCall({ ...base, model: `vendor/${"m".repeat(300)}` }));
    expect(parsed.model).toHaveLength(120);
  });
});

describe("log.ts", () => {
  it("pickAllowed лишає лише поля зі схеми", () => {
    expect(pickAllowed({ a: "x1", b: USER_TEXT, c: true }, { a: "token", c: "boolean" })).toEqual({ a: "x1", c: true });
  });

  it("formatEvent відмовляється від назви події з довільним текстом", () => {
    expect(() => formatEvent(USER_TEXT, {}, {})).toThrow("log: invalid event name");
  });
});

describe("isFallback", () => {
  it("порівнює моделі без суфікса :free", () => {
    expect(isFallback("google/gemma-4-31b-it", "google/gemma-4-31b-it:free")).toBe(false);
    expect(isFallback("google/gemma-4-31b-it:free", "nvidia/nemotron-3.5-super-vl:free")).toBe(true);
  });
});

// Справжній шлях коду зрізу 4: proposeDocument → generateText (тестова модель, без мережі й ключа) → llm.call.
describe("proposeDocument пише llm.call без тексту документа", () => {
  const LOG = { requestId: "0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d", route: "/runs/[id]", primaryModel: PRODUCT_MODELS[0] };
  const usage = {
    inputTokens: { total: 321, noCache: 321, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 54, text: 54, reasoning: undefined },
  };
  // Відповідь моделі навмисно повторює дані документа: якби журнал писав відповідь, маркери б його видали.
  const answer = JSON.stringify({
    status: "ok",
    kind: "request",
    phone: "555-0103",
    description: "Kitchen sink leaks under the cabinet",
    category: "plumbing",
    urgency: "not urgent",
    lineItems: null,
    statedTotal: null,
    notes: ["Olena asks to call before the visit"],
    injectionIgnored: false,
  });

  let info: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const loggedLines = () => [...info.mock.calls, ...error.mock.calls].map(([line]) => String(line)).filter((l) => l.includes('"llm.call"'));

  it("відповідь моделі: один рядок зі станом, моделлю, токенами й версією промпту", async () => {
    const model = new MockLanguageModelV4({
      modelId: "google/gemma-4-31b-it:free", // відповіла не перша модель ланцюжка — fallback
      doGenerate: async () => ({ content: [{ type: "text", text: answer }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] }),
    });
    const result = await proposeDocument({ text: USER_TEXT }, model, { log: LOG });
    expect(result.ok).toBe(true);

    const lines = loggedLines();
    expect(lines).toHaveLength(1);
    expectNoUserText(lines[0]);
    expect(JSON.parse(lines[0])).toMatchObject({
      event: "llm.call",
      requestId: LOG.requestId,
      route: "/runs/[id]",
      model: "google/gemma-4-31b-it:free",
      fallbackUsed: true,
      state: "ok",
      inputTokens: 321,
      outputTokens: 54,
      promptVersion: DRAFT_PROMPT_VERSION,
    });
  });

  it("збій моделі: стан unavailable рівнем error і лише код причини, без тексту від постачальника", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: `Rate limit exceeded while reading: ${USER_TEXT}`,
          url: "https://openrouter.ai/api/v1/chat/completions",
          requestBodyValues: { messages: [{ role: "user", content: USER_TEXT }] },
          statusCode: 429,
          isRetryable: false,
        });
      },
    });
    const result = await proposeDocument({ text: USER_TEXT }, model, { log: LOG, maxRetries: 0 });
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });

    const lines = loggedLines();
    expect(lines).toHaveLength(1);
    expect(error).toHaveBeenCalledWith(lines[0]);
    expectNoUserText(lines[0]);
    expect(JSON.parse(lines[0])).toMatchObject({
      state: "unavailable",
      errorKind: "rate_limited",
      model: PRODUCT_MODELS[0],
      fallbackUsed: false,
    });
  });

  it("без параметра log нічого не пише (golden-тести й eval)", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: "text", text: answer }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] }),
    });
    await proposeDocument({ text: USER_TEXT }, model);
    expect(loggedLines()).toHaveLength(0);
  });
});
