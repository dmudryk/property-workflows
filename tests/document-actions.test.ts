import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UNAVAILABLE_MESSAGE } from "@/lib/ai/document-rules";
import { requestDocumentDraft, saveDocumentValues, type SaveState } from "@/app/runs/[id]/document-actions";
import { renderToStaticMarkup } from "react-dom/server";
import { loadRunDocuments, RunDocuments } from "@/app/runs/[id]/run-documents";

// Дії AI-розбору документа — справжні requestDocumentDraft / saveDocumentValues, справжній requireActor() і справжня
// обгортка моделі (src/lib/ai/openrouter.ts). Замокано лише клієнт Supabase (роль у profiles, менеджер запуску в runs,
// rpc — записуються всі виклики), пакет `server-only` (у Vitest немає серверного оточення Next.js) і мережу: fetch
// відповідає як OpenRouter, і кожен виклик моделі записується. Хто може зберегти значення, вирішує база
// (tests/db/run-documents.test.ts); тут — що дія НЕ кличе модель і НЕ пише, коли не має, і що пише лише після
// «Save values» з повторною перевіркою.
const MANAGER_A = "manager-a";
const SAVE_IDLE: SaveState = { status: "idle", seq: 0, savedSeq: 0 };
const RUN_ID = "acde19d4-83ed-432b-a9e0-c75e12ab2d1e";

const state = vi.hoisted(() => ({
  userId: "manager-a",
  role: "manager",
  runManager: "manager-a" as string | null,
  rpc: [] as { name: string; args: Record<string, unknown> }[],
  rpcError: null as null | { code: string; message: string },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: state.userId } }, error: null }) },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () =>
          table === "profiles"
            ? { data: { role: state.role, email: `${state.userId}@example.test`, full_name: null }, error: null }
            : { data: state.runManager ? { manager_id: state.runManager } : null, error: null },
      };
      return query;
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      state.rpc.push({ name, args });
      return { data: state.rpcError ? null : "doc-1", error: state.rpcError };
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const tapAnswer = JSON.stringify({
  status: "ok",
  kind: "request",
  phone: "555-0101",
  description: "Kitchen tap in apartment 12 has been dripping for three days",
  category: "plumbing",
  urgency: "not urgent",
  lineItems: [],
  statedTotal: null,
  notes: [],
  injectionIgnored: false,
});

// Мережа: відповідь OpenRouter (chat completions) з текстом моделі; кожен запит до моделі записується.
const modelCalls: string[] = [];
function answerWith(content: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      modelCalls.push(String(url));
      const body =
        status === 200
          ? {
              id: "gen-1",
              object: "chat.completion",
              created: 1,
              model: "nvidia/nemotron-3.5-super-vl:free",
              choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            }
          : { error: { code: status, message: "Rate limit exceeded: free-models-per-day" } };
      return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    }),
  );
}

const TAP_EMAIL =
  "Subject: Dripping tap. Hi, the kitchen tap in apartment 12 has been dripping for three days. Please send someone this week. My phone is 555-0101. Lena Test";

function proposeForm(text = TAP_EMAIL) {
  const data = new FormData();
  data.set("run_id", RUN_ID);
  data.set("text", text);
  return data;
}

function saveForm(values: Record<string, unknown>) {
  const data = new FormData();
  data.set("run_id", RUN_ID);
  data.set("values", JSON.stringify(values));
  return data;
}

const tapValues = {
  kind: "request",
  phone: "555-0101",
  description: "Kitchen tap in apartment 12 has been dripping for three days",
  category: "plumbing",
  urgency: "urgent",
  lineItems: [],
  statedTotal: null,
  notes: [],
};

beforeEach(() => {
  state.userId = MANAGER_A;
  state.role = "manager";
  state.runManager = MANAGER_A;
  state.rpc = [];
  state.rpcError = null;
  modelCalls.length = 0;
  vi.stubEnv("OPENROUTER_API_KEY", "test-key-not-real");
  answerWith(tapAnswer);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("document-parsing: дії", () => {
  it("AC-DOCAI-01: лист про кран — Document type «Maintenance request», Phone «555-0101», plumbing, not urgent, нічого не збережено", async () => {
    const result = await requestDocumentDraft({ status: "idle" }, proposeForm());

    expect(result).toMatchObject({
      status: "proposed",
      proposal: { kind: "request", phone: "555-0101", category: "plumbing", urgency: "not urgent", notes: [] },
    });
    expect(state.rpc).toEqual([]);
  });

  it("AC-DOCAI-11: порожнє поле чи лише пробіли — «Paste the text of a document», модель не викликано, значень немає", async () => {
    for (const text of ["", "   \n\t  "]) {
      expect(await requestDocumentDraft({ status: "idle" }, proposeForm(text))).toEqual({
        status: "error",
        message: "Paste the text of a document",
        seq: 1,
      });
    }
    expect(modelCalls).toEqual([]);
    expect(state.rpc).toEqual([]);
  });

  it("AC-DOCAI-04: «Propose values» лише повертає пропозицію у форму — у базу нічого не записано", async () => {
    const result = await requestDocumentDraft({ status: "idle" }, proposeForm());

    expect(result).toMatchObject({ status: "proposed", proposal: { phone: "555-0101", category: "plumbing", urgency: "not urgent" } });
    expect(modelCalls).toEqual(["https://openrouter.ai/api/v1/chat/completions"]);
    expect(state.rpc).toEqual([]);
  });

  it("AC-DOCAI-04: «Save values» зберігає значення, як їх виправила людина, — urgency urgent", async () => {
    const result = await saveDocumentValues(SAVE_IDLE, saveForm(tapValues));

    expect(result).toMatchObject({ status: "saved" });
    expect(state.rpc).toEqual([
      {
        name: "save_run_document",
        args: expect.objectContaining({ p_run_id: RUN_ID, p_kind: "request", p_phone: "555-0101", p_urgency: "urgent" }),
      },
    ]);
  });

  it("AC-DOCAI-04: значення не за схемою від клієнта не зберігаємо", async () => {
    const result = await saveDocumentValues(SAVE_IDLE, saveForm({ ...tapValues, category: "dragons" }));

    expect(result).toMatchObject({ status: "error", message: "Check the value of Category." });
    expect(state.rpc).toEqual([]);
  });

  it("AC-DOCAI-04: позиція без ціни — повідомлення називає позицію й поле, нічого не збережено", async () => {
    const result = await saveDocumentValues(
      SAVE_IDLE,
      saveForm({ ...tapValues, kind: "estimate", category: null, urgency: null, lineItems: [{ description: "Labour", quantity: 1, unitPrice: null }], statedTotal: 60 }),
    );

    expect(result).toMatchObject({ status: "error", message: "Item 1: enter a unit price of 0 or more." });
    expect(state.rpc).toEqual([]);
  });

  it("AC-DOCAI-08: попередження суми рахує сервер за значеннями, які зберігає людина", async () => {
    const items = [
      { description: "Inspection", quantity: 1, unitPrice: 90 },
      { description: "Replace valve", quantity: 1, unitPrice: 70 },
      { description: "Labour", quantity: 1, unitPrice: 60 },
    ];
    await saveDocumentValues(
      SAVE_IDLE,
      saveForm({ ...tapValues, kind: "estimate", category: null, urgency: null, lineItems: items, statedTotal: 200, notes: ["items add up to 1.00, the stated total is 2.00"] }),
    );

    expect(state.rpc[0].args.p_notes).toEqual(["items add up to 220.00, the stated total is 200.00"]);
    expect(state.rpc[0].args.p_line_items).toEqual([
      { description: "Inspection", quantity: 1, unit_price: 90 },
      { description: "Replace valve", quantity: 1, unit_price: 70 },
      { description: "Labour", quantity: 1, unit_price: 60 },
    ]);
  });

  it("AC-DOCAI-08: шість нотаток людини не витісняють попередження суми — воно збережене", async () => {
    const items = [
      { description: "Inspection", quantity: 1, unitPrice: 90 },
      { description: "Labour", quantity: 1, unitPrice: 60 },
    ];
    const six = ["n1", "n2", "n3", "n4", "n5", "n6"];
    await saveDocumentValues(SAVE_IDLE, saveForm({ ...tapValues, kind: "estimate", category: null, urgency: null, lineItems: items, statedTotal: 200, notes: six }));

    expect(state.rpc[0].args.p_notes).toEqual(["n1", "n2", "n3", "n4", "n5", "items add up to 150.00, the stated total is 200.00"]);
  });

  it("AC-DOCAI-04: після невдалого збереження номер останнього успішного не змінюється — форма лишає введене", async () => {
    state.rpcError = { code: "XX000", message: "boom" };
    const saved: SaveState = { status: "saved", seq: 1, savedSeq: 1 };

    expect(await saveDocumentValues(saved, saveForm(tapValues))).toEqual({
      status: "error",
      message: "The values could not be saved. Try again.",
      seq: 2,
      savedSeq: 1,
    });
  });

  it("AC-DOCAI-04: збій читання збережених документів — окремий стан, а не порожній список", async () => {
    const failing = {
      from: () => {
        const q = {
          select: () => q,
          eq: () => q,
          order: async () => ({ data: null, error: { code: "57014", message: "statement timeout" } }),
        };
        return q;
      },
    } as unknown as Parameters<typeof loadRunDocuments>[0];

    expect(await loadRunDocuments(failing, { id: MANAGER_A, role: "manager" }, RUN_ID, MANAGER_A)).toEqual({ documents: [], loadFailed: true });
    expect(await loadRunDocuments(failing, { id: "vendor-v", role: "vendor" }, RUN_ID, null)).toBeNull();
  });

  it("AC-DOCAI-15: менеджер B — виконавець задачі в запуску менеджера A — не бачить блоку «Parse a document»", async () => {
    const supabase = {
      from: () => {
        throw new Error("збережені документи для B не читаємо");
      },
    } as unknown as Parameters<typeof loadRunDocuments>[0];
    const documents = await loadRunDocuments(supabase, { id: "manager-b", role: "manager" }, RUN_ID, MANAGER_A);

    expect(documents).toBeNull();
    expect(renderToStaticMarkup(RunDocuments({ runId: RUN_ID, documents, authorLabel: () => "—" }))).toBe("");
  });

  it("AC-DOCAI-16: виконавець B (не менеджер запуску) — «Not enough rights», модель не викликано, нічого не записано", async () => {
    state.userId = "manager-b";

    expect(await requestDocumentDraft({ status: "idle" }, proposeForm())).toMatchObject({ status: "error", message: "Not enough rights" });
    expect(await saveDocumentValues(SAVE_IDLE, saveForm(tapValues))).toMatchObject({ status: "error", message: "Not enough rights" });
    expect(modelCalls).toEqual([]);
    expect(state.rpc).toEqual([]);
  });

  it("AC-DOCAI-16: вендор — «Not enough rights», модель не викликано, нічого не записано", async () => {
    state.userId = "vendor-v";
    state.role = "vendor";
    state.runManager = null; // таблицю runs вендору закрито (ADR 0005)

    expect(await requestDocumentDraft({ status: "idle" }, proposeForm())).toMatchObject({ status: "error", message: "Not enough rights" });
    expect(await saveDocumentValues(SAVE_IDLE, saveForm(tapValues))).toMatchObject({ status: "error", message: "Not enough rights" });
    expect(modelCalls).toEqual([]);
    expect(state.rpc).toEqual([]);
  });

  it("адміністратор чужого запуску розбирає документ (роль за Users & roles вимоги PM)", async () => {
    state.userId = "admin";
    state.role = "admin";

    expect(await requestDocumentDraft({ status: "idle" }, proposeForm())).toMatchObject({ status: "proposed" });
  });

  it("AC-DOCAI-13: ключа немає — «The assistant is not available now. Fill in the values yourself.», без сторінки помилки", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", " "); // пробіл = ключа немає (trim)

    expect(UNAVAILABLE_MESSAGE).toBe("The assistant is not available now. Fill in the values yourself.");
    expect(await requestDocumentDraft({ status: "idle" }, proposeForm())).toMatchObject({ status: "unavailable", message: UNAVAILABLE_MESSAGE });
  });

  it("AC-DOCAI-13: денний ліміт вичерпано (429) — той самий текст, без повторів у циклі", async () => {
    answerWith("", 429);

    expect(await requestDocumentDraft({ status: "idle" }, proposeForm())).toMatchObject({ status: "unavailable", message: UNAVAILABLE_MESSAGE });
    expect(modelCalls.length).toBeLessThanOrEqual(2); // maxRetries 1
  });

  it("AC-DOCAI-13: помічник недоступний — значення вводять вручну й зберігають «Save values»", async () => {
    answerWith("not json at all");

    expect(await requestDocumentDraft({ status: "idle" }, proposeForm())).toMatchObject({ status: "unavailable", message: UNAVAILABLE_MESSAGE });
    expect(await saveDocumentValues(SAVE_IDLE, saveForm(tapValues))).toMatchObject({ status: "saved" });
  });

  it("AC-DOCAI-09: документ не заявка й не кошторис — текст відмови, жодних значень", async () => {
    answerWith(JSON.stringify({ ...JSON.parse(tapAnswer), status: "refused" }));

    expect(await requestDocumentDraft({ status: "idle" }, proposeForm("Tonight's menu: tomato soup 6.50"))).toEqual({
      status: "refused",
      message: "This document is not a maintenance request or an estimate.",
      seq: 1,
    });
  });
});
