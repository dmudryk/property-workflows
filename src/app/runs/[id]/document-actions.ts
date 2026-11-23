"use server";

// Server Actions AI-розбору документа (impl-ws10-docai/design.md, D5): два кроки, між ними — людина.
//   1. requestDocumentDraft — хто кличе (getClaims і роль), спитати модель, ПОВЕРНУТИ пропозицію у форму. Нічого не пише.
//   2. saveDocumentValues   — людина переглянула й, можливо, виправила значення та натиснула «Save values»: перевірити
//                             ще раз на сервері (клієнт може надіслати що завгодно) і лише тоді писати в базу.
// Взято за зразком koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/app/ai-draft/actions.ts.
import { revalidatePath } from "next/cache";
import { proposeDocument, USER_MESSAGES } from "@/lib/ai/draft";
import {
  EMPTY_VALUES_ERROR,
  hasAnyValue,
  SaveValuesSchema,
  totalWarning,
  UNAVAILABLE_MESSAGE,
  type Proposal,
  type SaveValues,
} from "@/lib/ai/document-rules";
import { PRODUCT_MODELS } from "@/lib/ai/models";
import { productModel } from "@/lib/ai/openrouter";
import { requireActor } from "@/lib/auth/actor";
import { canParseDocuments, invalidFieldMessage, MSG_EMPTY_DOCUMENT, MSG_SAVE_FAILED } from "@/lib/runs/documents";
import { MSG_NOT_ENOUGH_RIGHTS } from "@/lib/templates/content";

export type ProposeState =
  | { status: "idle" }
  | { status: "proposed"; proposal: Proposal; seq: number }
  | { status: "refused" | "unavailable" | "error"; message: string; seq: number };

// savedSeq — номер останнього УСПІШНОГО збереження: форма починається заново лише після нього, а після помилки
// введене лишається (рев'ю CodeRabbit #55).
export type SaveState = { status: "idle" | "saved" | "error"; seq: number; savedSeq: number; message?: string };

type Session = Awaited<ReturnType<typeof requireActor>>;

// Адміністратор або менеджер запуску (AC-DOCAI-16). Запуск читаємо під сесією користувача (RLS): вендору таблицю
// runs закрито (ADR 0005), тож для нього запуску немає — відмова.
async function mayParse({ supabase, actor }: Session, runId: string): Promise<boolean> {
  if (!actor || !runId) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "manager") return false;
  const { data, error } = await supabase.from("runs").select("manager_id").eq("id", runId).maybeSingle();
  return !error && canParseDocuments(actor, data?.manager_id ?? null);
}

// Спільний перший крок обох дій: номер відповіді (форма знає, що прийшла нова), хто кличе і чи має право.
async function begin(prev: ProposeState | SaveState, formData: FormData) {
  const seq = ("seq" in prev ? prev.seq : 0) + 1;
  const session = await requireActor();
  const runId = String(formData.get("run_id") ?? "");
  return { seq, session, runId, allowed: await mayParse(session, runId) };
}

export async function requestDocumentDraft(prev: ProposeState, formData: FormData): Promise<ProposeState> {
  // 0. Авторизація ДО виклику моделі: інакше будь-хто витратить денний ліміт (50 запитів).
  const { seq, allowed } = await begin(prev, formData);
  if (!allowed) return { status: "error", message: MSG_NOT_ENOUGH_RIGHTS, seq };

  const text = String(formData.get("text") ?? "");
  if (!text.trim()) return { status: "error", message: MSG_EMPTY_DOCUMENT, seq };

  // Без ключа (немає, порожній, пробіли) — стан «недоступний», а не сторінка помилки (AC-DOCAI-13).
  const model = productModel();
  if (!model) return { status: "unavailable", message: UNAVAILABLE_MESSAGE, seq };

  // WS11: один рядок llm.call у журналі Vercel на виклик — без тексту документа (src/lib/ai/llm-log.ts).
  // route — шаблон маршруту, не адреса з id запуску.
  const result = await proposeDocument({ text }, model, {
    log: { requestId: crypto.randomUUID(), route: "/runs/[id]", primaryModel: PRODUCT_MODELS[0] },
  });
  if (!result.ok) return { status: "unavailable", message: USER_MESSAGES[result.reason], seq };
  if (result.proposal.status === "refused") return { status: "refused", message: result.proposal.message ?? "", seq };
  return { status: "proposed", proposal: result.proposal, seq };
}

// Значення з форми: JSON → повторна перевірка на сервері (переліки, кількість > 0, довжини; AC-DOCAI-04).
function parseValues(formData: FormData): { values: SaveValues } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("values") ?? ""));
  } catch {
    return { error: MSG_SAVE_FAILED };
  }
  const parsed = SaveValuesSchema.safeParse(raw);
  if (!parsed.success) return { error: invalidFieldMessage(parsed.error.issues[0]?.path ?? []) };
  return hasAnyValue(parsed.data) ? { values: parsed.data } : { error: EMPTY_VALUES_ERROR };
}

export async function saveDocumentValues(prev: SaveState, formData: FormData): Promise<SaveState> {
  const { seq, session, runId, allowed } = await begin(prev, formData);
  const failed = (message: string): SaveState => ({ status: "error", message, seq, savedSeq: prev.savedSeq });
  if (!allowed) return failed(MSG_NOT_ENOUGH_RIGHTS);

  const checked = parseValues(formData);
  if ("error" in checked) return failed(checked.error);
  const { values } = checked;

  // Попередження суми рахує код за значеннями, які людина зберігає (AC-DOCAI-08), а не те, що бачила модель.
  const warning = totalWarning(values.lineItems, values.statedTotal);
  // Місце для попередження лишаємо завжди: звичайні нотатки обрізаємо ДО нього (рев'ю CodeRabbit #55).
  const ordinary = values.notes.filter((n) => !n.startsWith("items add up to")).slice(0, warning ? 5 : 6);
  const notes = warning ? [...ordinary, warning] : ordinary;

  // Запис — функцією бази під сесією користувача; права вирішує база (private.save_run_document, AC-DOCAI-16).
  const { error } = await session.supabase.rpc("save_run_document", {
    p_run_id: runId,
    p_kind: values.kind,
    p_phone: values.phone,
    p_description: values.description,
    p_category: values.category,
    p_urgency: values.urgency,
    p_line_items: values.lineItems.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unitPrice })),
    p_stated_total: values.statedTotal,
    p_notes: notes,
  });
  if (error) return failed(error.code === "42501" ? MSG_NOT_ENOUGH_RIGHTS : MSG_SAVE_FAILED);

  revalidatePath(`/runs/${runId}`);
  return { status: "saved", seq, savedSeq: seq };
}
