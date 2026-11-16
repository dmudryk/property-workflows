"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";
import { FormSelect, type FormSelectItem } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { totalWarning, type Proposal } from "@/lib/ai/document-rules";
import { CATEGORIES, URGENCIES, type Category, type DocumentKind, type Urgency } from "@/lib/ai/schema";
import { KIND_LABELS } from "@/lib/runs/documents";
import { requestDocumentDraft, saveDocumentValues, type ProposeState, type SaveState } from "./document-actions";

// Блок «Parse a document» на сторінці запуску (impl-ws10-docai/design.md, D1). AI лише пропонує значення у форму
// (AC-DOCAI-01…08); людина може виправити кожне й зберігає їх окремою дією «Save values» (AC-DOCAI-09). Коли
// помічник недоступний, форма лишається для ручного введення (AC-DOCAI-10). Блок бачать лише адміністратор і менеджер
// запуску — це вирішує сторінка, а права ще раз перевіряють дії й база (AC-DOCAI-11).
// Модель і ключ сюди не імпортуються: лише Server Actions (tests/ai-key.test.ts).

type ItemDraft = { description: string; quantity: string; unitPrice: string };
type Values = {
  kind: DocumentKind;
  phone: string;
  description: string;
  category: Category | null;
  urgency: Urgency | null;
  lineItems: ItemDraft[];
  statedTotal: string;
  notes: string[];
};

const EMPTY: Values = {
  kind: "request",
  phone: "",
  description: "",
  category: null,
  urgency: null,
  lineItems: [],
  statedTotal: "",
  notes: [],
};

// Числа документа показуємо як є: 85 → «85.00», але 0.125 лишається 0.125 — без округлення, яке змінило б значення
// документа й дало хибне попередження суми (AC-DOCAI-05, AC-DOCAI-06; code-review 16.11).
const asWritten = (n: number) => (Number.isInteger(n * 100) ? n.toFixed(2) : String(n));

const fromProposal = (p: Proposal): Values => ({
  kind: p.kind ?? "request",
  phone: p.phone ?? "",
  description: p.description ?? "",
  category: p.category,
  urgency: p.urgency,
  lineItems: p.lineItems.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: asWritten(i.unitPrice) })),
  statedTotal: p.statedTotal === null ? "" : asWritten(p.statedTotal),
  notes: p.notes,
});

const KIND_ITEMS: FormSelectItem[] = (Object.keys(KIND_LABELS) as DocumentKind[]).map((k) => ({ value: k, label: KIND_LABELS[k] }));
const CATEGORY_ITEMS: FormSelectItem[] = [{ value: null, label: "Not set" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
const URGENCY_ITEMS: FormSelectItem[] = [{ value: null, label: "Not set" }, ...URGENCIES.map((u) => ({ value: u, label: u }))];

// Порожнє — null; десяткова кома («1,5») — як крапка.
const toNumber = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));

// Значення форми → JSON для saveDocumentValues; сервер перевіряє їх ще раз (SaveValuesSchema).
function payload(v: Values): string {
  const estimate = v.kind === "estimate";
  return JSON.stringify({
    kind: v.kind,
    phone: v.phone.trim() || null,
    description: v.description.trim() || null,
    category: estimate ? null : v.category,
    urgency: estimate ? null : v.urgency,
    lineItems: estimate
      ? v.lineItems.map((i) => ({ description: i.description.trim(), quantity: toNumber(i.quantity), unitPrice: toNumber(i.unitPrice) }))
      : [],
    statedTotal: estimate ? toNumber(v.statedTotal) : null,
    notes: v.notes,
  });
}

// Попередження суми — за поточними значеннями, як їх виправила людина (AC-DOCAI-06).
function liveWarning(v: Values): string | null {
  if (v.kind !== "estimate") return null;
  // Незаповнена кількість чи ціна — не 0: поки позиція неповна, суму не рахуємо (code-review 16.11).
  const items = v.lineItems.map((i) => ({ description: i.description, quantity: toNumber(i.quantity), unitPrice: toNumber(i.unitPrice) }));
  const total = toNumber(v.statedTotal);
  const complete = items.every((i) => Number.isFinite(i.quantity) && Number.isFinite(i.unitPrice));
  if (!complete || (total !== null && !Number.isFinite(total))) return null;
  return totalWarning(items as { description: string; quantity: number; unitPrice: number }[], total);
}

function NotFound({ field, show }: { field: string; show: boolean }) {
  return show ? (
    <span data-testid={`docai-not-found-${field}`} className="text-sm text-muted-foreground">
      not found
    </span>
  ) : null;
}

function ValuesForm({
  runId,
  initial,
  proposed,
  saveAction,
  saveState,
}: {
  runId: string;
  initial: Values;
  proposed: boolean;
  saveAction: (formData: FormData) => void;
  saveState: SaveState;
}) {
  const [v, setV] = useState<Values>(initial);
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));
  const setItem = (n: number, patch: Partial<ItemDraft>) =>
    set({ lineItems: v.lineItems.map((item, i) => (i === n ? { ...item, ...patch } : item)) });
  // «not found» — лише для значень, які AI не знайшов у документі (AC-DOCAI-02), поки людина їх не ввела.
  const missing = (value: string | null) => proposed && !value;
  const warning = liveWarning(v);
  const estimate = v.kind === "estimate";

  return (
    <form action={saveAction} className="flex flex-col gap-4" data-testid="docai-values">
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="values" value={payload(v)} />

      {v.notes.length > 0 ? (
        <Alert data-testid="docai-notes">
          <AlertTitle>Notes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {v.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {warning ? (
        <Alert data-testid="docai-warning">
          <AlertDescription className="text-foreground">{warning}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="docai-kind">Document type</Label>
        <FormSelect id="docai-kind" items={KIND_ITEMS} value={v.kind} onValueChange={(k) => set({ kind: (k as DocumentKind) ?? "request" })} />
      </div>

      {!estimate ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="docai-phone">Phone</Label>
            <NotFound field="phone" show={missing(v.phone)} />
          </div>
          <Input id="docai-phone" data-testid="docai-phone" value={v.phone} maxLength={40} onChange={(e) => set({ phone: e.target.value })} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="docai-description">Description</Label>
          <NotFound field="description" show={missing(v.description)} />
        </div>
        <Textarea
          id="docai-description"
          data-testid="docai-description"
          value={v.description}
          maxLength={500}
          rows={2}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      {!estimate ? (
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-48 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="docai-category">Category</Label>
              <NotFound field="category" show={missing(v.category)} />
            </div>
            <FormSelect
              id="docai-category"
              items={CATEGORY_ITEMS}
              value={v.category}
              onValueChange={(c) => set({ category: c as Category | null })}
            />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="docai-urgency">Urgency</Label>
              <NotFound field="urgency" show={missing(v.urgency)} />
            </div>
            <FormSelect
              id="docai-urgency"
              items={URGENCY_ITEMS}
              value={v.urgency}
              onValueChange={(u) => set({ urgency: u as Urgency | null })}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Line items</p>
          {v.lineItems.length === 0 ? <NotFound field="line-items" show={proposed} /> : null}
          <ol className="flex flex-col gap-2" data-testid="docai-line-items">
            {v.lineItems.map((item, n) => (
              <li key={n} className="flex flex-wrap items-end gap-2">
                <div className="flex min-w-40 flex-3 flex-col gap-2">
                  <Label htmlFor={`docai-item-${n}`}>Item {n + 1}</Label>
                  <Input id={`docai-item-${n}`} value={item.description} maxLength={200} onChange={(e) => setItem(n, { description: e.target.value })} />
                </div>
                <div className="flex w-24 flex-col gap-2">
                  <Label htmlFor={`docai-qty-${n}`}>Quantity</Label>
                  <Input id={`docai-qty-${n}`} inputMode="decimal" className="tabular-nums" value={item.quantity} onChange={(e) => setItem(n, { quantity: e.target.value })} />
                </div>
                <div className="flex w-28 flex-col gap-2">
                  <Label htmlFor={`docai-price-${n}`}>Unit price</Label>
                  <Input id={`docai-price-${n}`} inputMode="decimal" className="tabular-nums" value={item.unitPrice} onChange={(e) => setItem(n, { unitPrice: e.target.value })} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xl"
                  aria-label={`Remove item ${n + 1}`}
                  onClick={() => set({ lineItems: v.lineItems.filter((_, i) => i !== n) })}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="dashed"
            className="self-start"
            onClick={() => set({ lineItems: [...v.lineItems, { description: "", quantity: "1", unitPrice: "" }] })}
          >
            <PlusIcon aria-hidden />
            Add item
          </Button>
          <div className="flex w-40 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="docai-total">Total</Label>
              <NotFound field="total" show={missing(v.statedTotal)} />
            </div>
            <Input id="docai-total" data-testid="docai-total" inputMode="decimal" className="tabular-nums" value={v.statedTotal} onChange={(e) => set({ statedTotal: e.target.value })} />
          </div>
        </div>
      )}

      {saveState.status === "error" && saveState.message ? (
        <Alert variant="destructive" data-testid="docai-save-error">
          <AlertDescription className="text-destructive">{saveState.message}</AlertDescription>
        </Alert>
      ) : null}
      <SubmitButton data-testid="docai-save" pendingLabel="Saving values…" className="self-start">
        Save values
      </SubmitButton>
    </form>
  );
}

// Стан із попереднього рендеру (React: «adjusting state when a prop changes»).

// Номер відповіді, з якої форма значень почалася заново: лише нова пропозиція чи відмова. Помилка («порожній текст»)
// і «недоступний» лишають значення, які людина вже ввела вручну (AC-DOCAI-10; code-review 16.11).
function useFormSeq(state: ProposeState, proposeSeq: number) {
  const [formSeq, setFormSeq] = useState(0);
  const resets = state.status === "proposed" || state.status === "refused";
  if (resets && proposeSeq !== formSeq) setFormSeq(proposeSeq);
  return formSeq;
}

// Номер пропозиції, яку вже збережено: після успішного «Save values» форма порожня, а не знову з пропозиції моделі
// (UAT на проді 16.11: після збереження urgent форма знову показувала «not urgent» моделі).
function useConsumedProposal(save: SaveState, proposeSeq: number) {
  const [consumed, setConsumed] = useState({ savedSeq: 0, proposeSeq: 0 });
  if (save.savedSeq !== consumed.savedSeq) setConsumed({ savedSeq: save.savedSeq, proposeSeq });
  return consumed.proposeSeq;
}

// Повідомлення збереження — лише про спробу після останньої відповіді «Propose values» (code-review 16.11).
function useCurrentSave(save: SaveState, proposeSeq: number): SaveState {
  const [saveAt, setSaveAt] = useState({ seq: 0, proposeSeq: 0 });
  if (save.seq !== saveAt.seq) setSaveAt({ seq: save.seq, proposeSeq });
  return saveAt.proposeSeq === proposeSeq ? save : { ...save, status: "idle" };
}

const seqOf = (state: ProposeState) => ("seq" in state ? state.seq : 0);
const valuesFrom = (proposal: Proposal | null): Values => (proposal ? fromProposal(proposal) : EMPTY);

// Відмова (AC-DOCAI-07), «недоступний» (AC-DOCAI-10) чи помилка дії — повідомлення над формою.
function ProposeMessage({ state }: { state: ProposeState }) {
  if (state.status !== "refused" && state.status !== "unavailable" && state.status !== "error") return null;
  const error = state.status === "error";
  return (
    <Alert variant={error ? "destructive" : "default"} data-testid="docai-message">
      <AlertDescription className={error ? "text-destructive" : "text-foreground"}>{state.message}</AlertDescription>
    </Alert>
  );
}

export function DocumentParser({ runId }: { runId: string }) {
  const [proposeState, proposeAction] = useActionState<ProposeState, FormData>(requestDocumentDraft, { status: "idle" });
  const [saveState, saveAction] = useActionState<SaveState, FormData>(saveDocumentValues, { status: "idle", seq: 0, savedSeq: 0 });

  // Текст документа — керований: React 19 після дії форми очищає некеровані поля, а людина звіряє пропозицію з
  // оригіналом і при «недоступний» переносить значення з нього вручну (code-review 16.11).
  const [text, setText] = useState("");
  const proposeSeq = seqOf(proposeState);
  const formSeq = useFormSeq(proposeState, proposeSeq);
  const consumedSeq = useConsumedProposal(saveState, proposeSeq);
  const shownSave = useCurrentSave(saveState, proposeSeq);

  const proposal = proposeState.status === "proposed" && proposeSeq > consumedSeq ? proposeState.proposal : null;
  // Після помилки збереження ключ не змінюється: введене лишається для повторної спроби (рев'ю CodeRabbit #55).
  const formKey = `${formSeq}-${saveState.savedSeq}`;

  return (
    <Card data-testid="document-parser" className="bg-background">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Parse a document</CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste a tenant&apos;s request or a vendor&apos;s estimate. The assistant proposes values; nothing is saved until you
          select Save values.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={proposeAction} className="flex flex-col gap-4">
          <input type="hidden" name="run_id" value={runId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="docai-text">Document text</Label>
            <Textarea
              id="docai-text"
              data-testid="docai-text"
              name="text"
              rows={5}
              maxLength={8000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <SubmitButton data-testid="docai-propose" variant="outline" pendingLabel="Proposing values…" className="self-start">
            Propose values
          </SubmitButton>
        </form>

        <ProposeMessage state={proposeState} />

        <ValuesForm
          key={formKey}
          runId={runId}
          initial={valuesFrom(proposal)}
          proposed={proposal !== null}
          saveAction={saveAction}
          saveState={shownSave}
        />

        <p aria-live="polite" data-testid="docai-saved" className="text-sm">
          {shownSave.status === "saved" ? "Values saved" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
