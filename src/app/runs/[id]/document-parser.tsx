"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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
import {
  documentBlockView,
  EMPTY_FORM_VALUES,
  isPlainTextFile,
  KIND_OPTIONS,
  MSG_READING,
  MSG_TEXT_FILES_ONLY,
  type DocumentFormItem,
  type DocumentFormValues,
} from "@/lib/runs/documents";
import { requestDocumentDraft, saveDocumentValues, type ProposeState, type SaveState } from "./document-actions";

// Блок «Parse a document» на сторінці запуску (impl-ws10-docai/design.md, D1; impl-clarify-ws10-docai/design.md, D2).
// Текст вставляють або завантажують файлом .txt (AC-DOCAI-12). AI лише пропонує значення у форму (AC-DOCAI-01, 02,
// 06–10); поки він читає — «Reading the document…» (AC-DOCAI-03). Людина може виправити кожне значення й зберігає їх
// окремою дією «Save values» (AC-DOCAI-04) або відкидає «Discard» (AC-DOCAI-05). Коли помічник недоступний, Document
// type і значення порожні для ручного введення (AC-DOCAI-13). Блок бачать лише адміністратор і менеджер запуску — це
// вирішує сторінка, а права ще раз перевіряють дії й база (AC-DOCAI-14, AC-DOCAI-15, AC-DOCAI-16).
// Модель і ключ сюди не імпортуються: лише Server Actions (tests/ai-key.test.ts).

type ItemDraft = DocumentFormItem;
type Values = DocumentFormValues;
const EMPTY = EMPTY_FORM_VALUES;

// Числа документа показуємо як є: 85 → «85.00», але 0.125 лишається 0.125 — без округлення, яке змінило б значення
// документа й дало хибне попередження суми (AC-DOCAI-02, AC-DOCAI-08; code-review 16.11).
const asWritten = (n: number) => (Number.isInteger(n * 100) ? n.toFixed(2) : String(n));

const fromProposal = (p: Proposal): Values => ({
  kind: p.kind,
  phone: p.phone ?? "",
  description: p.description ?? "",
  category: p.category,
  urgency: p.urgency,
  lineItems: p.lineItems.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: asWritten(i.unitPrice) })),
  statedTotal: p.statedTotal === null ? "" : asWritten(p.statedTotal),
  notes: p.notes,
});

const KIND_ITEMS: FormSelectItem[] = KIND_OPTIONS;
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

// Попередження суми — за поточними значеннями, як їх виправила людина (AC-DOCAI-08).
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
  onDiscard,
}: {
  runId: string;
  initial: Values;
  proposed: boolean;
  saveAction: (formData: FormData) => void;
  saveState: SaveState;
  onDiscard: () => void;
}) {
  const [v, setV] = useState<Values>(initial);
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));
  const setItem = (n: number, patch: Partial<ItemDraft>) =>
    set({ lineItems: v.lineItems.map((item, i) => (i === n ? { ...item, ...patch } : item)) });
  // «not found» — лише для значень, які AI не знайшов у документі (AC-DOCAI-06), поки людина їх не ввела.
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
        <FormSelect id="docai-kind" items={KIND_ITEMS} value={v.kind} onValueChange={(k) => set({ kind: k as DocumentKind | null })} />
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
      <div className="flex flex-wrap gap-3">
        <SubmitButton data-testid="docai-save" pendingLabel="Saving values…">
          Save values
        </SubmitButton>
        <DiscardButton onDiscard={onDiscard} />
      </div>
    </form>
  );
}

// AC-DOCAI-05: «Discard» — блок знову порожній, нічого не збережено. Поки триває «Save values», кнопка вимкнена: інакше
// форма очистилася б, а запис однаково зберігся б (рев'ю CodeRabbit #60).
function DiscardButton({ onDiscard }: { onDiscard: () => void }) {
  const { pending } = useFormStatus();
  return (
    <Button type="button" variant="outline" data-testid="docai-discard" disabled={pending} onClick={onDiscard}>
      Discard
    </Button>
  );
}

// Стан із попереднього рендеру (React: «adjusting state when a prop changes»).

// Номер пропозиції, яку вже збережено: після успішного «Save values» блок знову порожній, а не з пропозицією моделі
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
const proposalOf = (state: ProposeState, shown: boolean) => (shown && state.status === "proposed" ? state.proposal : null);

type BlockText = { text: string; error: boolean };

// Повідомлення під полем тексту: файл не .txt (AC-DOCAI-12); інакше — відмова (AC-DOCAI-09), «недоступний»
// (AC-DOCAI-13) чи помилка дії (AC-DOCAI-11, AC-DOCAI-16). Поки AI читає, повідомлень немає (AC-DOCAI-03).
function messageFor(state: ProposeState, shown: boolean, fileError: string | null, proposing: boolean): BlockText | null {
  if (proposing) return null;
  if (fileError) return { text: fileError, error: true };
  if (!shown || !("message" in state)) return null;
  return { text: state.message, error: state.status === "error" };
}

// «Reading the document…» (AC-DOCAI-03) і повідомлення блоку.
function BlockStatus({ reading, message }: { reading: boolean; message: BlockText | null }) {
  return (
    <>
      {reading ? (
        <p role="status" aria-live="polite" data-testid="docai-reading" className="text-sm text-muted-foreground">
          {MSG_READING}
        </p>
      ) : null}
      {message ? (
        <Alert variant={message.error ? "destructive" : "default"} data-testid="docai-message">
          <AlertDescription className={message.error ? "text-destructive" : "text-foreground"}>{message.text}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

// Файл може бути великим: читаємо лише початок, а сервер однаково обрізає документ до MAX_DOCUMENT_CHARS.
const FILE_READ_LIMIT = 64_000;

// AC-DOCAI-12: «Upload a text file» — вибір файлу; перевіряє й читає його DocumentParser.
function UploadTextFile({ disabled, onPick }: { disabled: boolean; onPick: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".txt,text/plain"
        hidden
        data-testid="docai-file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" data-testid="docai-upload" disabled={disabled} onClick={() => input.current?.click()}>
        Upload a text file
      </Button>
    </>
  );
}

// Поле тексту, «Upload a text file» і «Propose values». Текст документа — керований: React 19 після дії форми очищає
// некеровані поля, а людина звіряє пропозицію з оригіналом і при «недоступний» переносить значення з нього вручну.
function ProposeForm({
  runId,
  text,
  proposing,
  readingFile,
  action,
  onTextChange,
  onSubmit,
  onPick,
}: {
  runId: string;
  text: string;
  proposing: boolean;
  readingFile: boolean;
  action: (formData: FormData) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onPick: (file: File) => void;
}) {
  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
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
          onChange={(e) => onTextChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <UploadTextFile disabled={proposing} onPick={onPick} />
        {/* AC-DOCAI-03: поки AI читає, кнопка лишається «Propose values», але вимкнена; і поки читається файл. */}
        <SubmitButton data-testid="docai-propose" variant="outline" pendingLabel="Propose values" disabled={readingFile}>
          Propose values
        </SubmitButton>
      </div>
    </form>
  );
}

// Текст файлу або null, коли браузер не зміг його прочитати.
async function readText(file: File): Promise<string | null> {
  try {
    return await file.slice(0, FILE_READ_LIMIT).text();
  } catch {
    return null;
  }
}

export function DocumentParser({ runId }: { runId: string }) {
  const [proposeState, proposeAction, proposing] = useActionState<ProposeState, FormData>(requestDocumentDraft, { status: "idle" });
  const [saveState, saveAction] = useActionState<SaveState, FormData>(saveDocumentValues, { status: "idle", seq: 0, savedSeq: 0 });
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  // Блок закрито «Discard» чи новим файлом; наступне «Propose values» його відкриває.
  const [closed, setClosed] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  // Номер читання файлу: новіший файл чи «Propose values» роблять незавершене читання застарілим — його результат
  // ігноруємо, щоб не поставити текст старого файлу поруч із новішою пропозицією (рев'ю CodeRabbit #60).
  const readSeq = useRef(0);

  const proposeSeq = seqOf(proposeState);
  const consumedSeq = useConsumedProposal(saveState, proposeSeq);
  const shownSave = useCurrentSave(saveState, proposeSeq);
  const view = documentBlockView({ status: proposeState.status, pending: proposing, closed: closed || proposeSeq <= consumedSeq });
  const proposal = proposalOf(proposeState, view.values);

  async function pickFile(file: File) {
    const mine = ++readSeq.current;
    setClosed(true);
    if (!isPlainTextFile(file)) {
      setReadingFile(false);
      setFileError(MSG_TEXT_FILES_ONLY);
      return;
    }
    setFileError(null);
    setReadingFile(true);
    const content = await readText(file);
    if (readSeq.current !== mine) return;
    setReadingFile(false);
    if (content === null) setFileError(MSG_TEXT_FILES_ONLY);
    else setText(content);
  }
  function submitted() {
    readSeq.current += 1;
    setReadingFile(false);
    setFileError(null);
    setClosed(false);
  }
  function discard() {
    readSeq.current += 1;
    setReadingFile(false);
    setText("");
    setFileError(null);
    setClosed(true);
  }

  return (
    <Card data-testid="document-parser" className="bg-background">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Parse a document</CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste a tenant&apos;s request or a vendor&apos;s estimate, or upload a text file. The assistant proposes values;
          nothing is saved until you select Save values.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ProposeForm
          runId={runId}
          text={text}
          proposing={proposing}
          readingFile={readingFile}
          action={proposeAction}
          onTextChange={setText}
          onSubmit={submitted}
          onPick={(file) => void pickFile(file)}
        />
        <BlockStatus reading={view.reading} message={messageFor(proposeState, view.message, fileError, proposing)} />
        {view.values && !fileError ? (
          <ValuesForm
            key={proposeSeq}
            runId={runId}
            initial={proposal ? fromProposal(proposal) : EMPTY}
            proposed={proposal !== null}
            saveAction={saveAction}
            saveState={shownSave}
            onDiscard={discard}
          />
        ) : null}
        <p aria-live="polite" data-testid="docai-saved" className="text-sm">
          {shownSave.status === "saved" ? "Values saved" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
