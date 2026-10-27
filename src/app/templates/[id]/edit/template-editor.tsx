"use client";

import { ChevronDownIcon, ChevronUpIcon, Loader2Icon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NumberBadge } from "@/components/number-badge";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSection,
  addTask,
  moveSection,
  moveTask,
  renameSection,
  renameTask,
  renameTemplate,
  toggleRequired,
  type TemplateContent,
} from "@/lib/templates/content";
import {
  removeConfirmation,
  resolveRemove,
  saveStatus,
  type PendingRemove,
  type SaveState,
} from "@/lib/templates/editor-state";
import { TEMPLATE_ERRORS, type TemplateError } from "@/lib/templates/errors";
import { versionLabel } from "@/lib/templates/format";
import { cn } from "@/lib/utils";
import { publishVersion, saveDraft } from "../../actions";

// Кнопка лише з іконкою (переміщення, видалення): 44px; вимкнена — бліда, з курсором not-allowed.
const ICON_BUTTON =
  "text-muted-foreground disabled:pointer-events-auto disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground";
const REMOVE_BUTTON = `${ICON_BUTTON} hover:bg-destructive/10 hover:text-destructive`;
const REQUIREMENT = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
] as const;

// Редактор шаблону (impl-ws7-templates/design.md, U2; impl-ws7-clarifications/design.md, U1): кожна зміна одразу
// зберігається як незбережені зміни (AC-EDITOR-01), зокрема назва шаблону (AC-EDITOR-21) і порожні назви (їх відхиляє
// збереження — AC-EDITOR-20). «Save version» створює версію й відкриває сторінку шаблону з «Version N saved»
// (AC-EDITOR-03) або показує помилку (AC-EDITOR-04, 15, 20, 24) без втрати змін. Server Actions виконуються по черзі:
// «Save version» спершу дочікується останнього автозбереження.

export function TemplateEditor({
  templateId,
  name,
  currentVersion,
  initialContent,
  initiallyUnpublished,
}: {
  templateId: string;
  name: string;
  currentVersion: number | null;
  initialContent: TemplateContent;
  initiallyUnpublished: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [unpublished, setUnpublished] = useState(initiallyUnpublished);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<TemplateError>("failed");
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<PendingRemove | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Найсвіжіший зміст: перейменування спрацьовує із затримкою й не має працювати зі старою копією.
  const latest = useRef(initialContent);

  function persist(update: (current: TemplateContent) => TemplateContent) {
    const next = update(latest.current);
    if (next === latest.current) return;
    latest.current = next;
    setContent(next);
    setSaveState("saving");
    // Кожна ланка черги ловить власні збої (мережа, 5xx): інакше відхилений promise зупинив би всі наступні збереження.
    // Збій — у фіксованому місці смуги (AC-EDITOR-25); правка лишається на екрані, а наступна зміна надішле весь зміст.
    queue.current = queue.current.then(async () => {
      try {
        const result = await saveDraft(templateId, next);
        if (result.ok) {
          setUnpublished(true);
          setSaveState("saved");
        } else {
          setSaveState("error");
          setSaveError(result.error);
        }
      } catch {
        setSaveState("error");
        setSaveError("failed");
      }
    });
  }

  // Збереження версії — теж ланка черги: спершу всі автозбереження, потім версія; правки після натискання підуть уже
  // в нові незбережені зміни.
  async function saveVersion() {
    setPublishing(true);
    setError(null);
    const step = queue.current.then(async () => {
      try {
        const result = await publishVersion(templateId);
        if (result.ok) {
          setUnpublished(false);
          // AC-EDITOR-03: «Version N saved» — на сторінці шаблону, яка вже показує нову поточну версію.
          router.push(result.version ? `/templates/${templateId}?saved=${result.version}` : `/templates/${templateId}`);
        } else {
          setError(TEMPLATE_ERRORS[result.error]);
        }
      } catch {
        setError(TEMPLATE_ERRORS.failed);
      }
    });
    queue.current = step;
    try {
      await step;
    } finally {
      setPublishing(false);
    }
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    const item = pendingRemove;
    persist((c) => resolveRemove(c, item, true));
    setPendingRemove(null);
  }

  const lastSection = content.sections.length - 1;
  const status = saveStatus(saveState, saveError);
  const confirmation = pendingRemove ? removeConfirmation(pendingRemove) : null;
  let taskNumber = 0;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        back={{ href: `/templates/${templateId}`, label: "Back to the template" }}
        title={content.name || name}
        badges={
          <Badge className="h-7 bg-secondary px-3 text-sm text-secondary-foreground tabular-nums">
            {currentVersion === null ? "Editing" : `Editing · ${versionLabel(currentVersion)}`}
          </Badge>
        }
        description="Changes are kept as you go. Save version to use them in new runs; runs already launched keep the version they started with."
      />

      {/* AC-EDITOR-21: перейменування — незбережена зміна; нова назва діє з наступною версією. */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="template-name">Template name</Label>
        <NameField
          id="template-name"
          label="Template name"
          value={content.name ?? name}
          className="h-11"
          onCommit={(value) => persist((c) => renameTemplate(c, value))}
        />
      </div>

      {content.sections.map((section, si) => (
        <Card key={section.id} className="gap-0 bg-background py-0">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted px-4 py-3 sm:px-5">
            <NumberBadge>{si + 1}</NumberBadge>
            <NameField
              label="Section name"
              value={section.name}
              className="h-11 bg-background text-base font-semibold"
              onCommit={(value) => persist((c) => renameSection(c, section.id, value))}
            />
            <div className="ml-auto flex items-center">
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label={`Move section up: ${section.name}`}
                className={ICON_BUTTON}
                disabled={si === 0}
                onClick={() => persist((c) => moveSection(c, section.id, -1))}
              >
                <ChevronUpIcon aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label={`Move section down: ${section.name}`}
                className={ICON_BUTTON}
                disabled={si === lastSection}
                onClick={() => persist((c) => moveSection(c, section.id, 1))}
              >
                <ChevronDownIcon aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label={`Remove section: ${section.name}`}
                className={REMOVE_BUTTON}
                onClick={() => setPendingRemove({ kind: "section", id: section.id, name: section.name })}
              >
                <Trash2Icon aria-hidden />
              </Button>
            </div>
          </div>
          {section.tasks.length > 0 ? (
            <ol className="flex flex-col divide-y divide-border/60">
              {section.tasks.map((task, ti) => (
                <li key={task.id} data-testid="editor-task" className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-5">
                  <NumberBadge size="sm">{++taskNumber}</NumberBadge>
                  <NameField
                    label="Task name"
                    value={task.name}
                    className="h-11"
                    onCommit={(value) => persist((c) => renameTask(c, task.id, value))}
                  />
                  <div className="ml-auto flex items-center gap-1">
                    <Segmented
                      label={`Required or optional: ${task.name}`}
                      options={REQUIREMENT}
                      value={task.required ? "required" : "optional"}
                      onChange={(next) => {
                        if ((next === "required") !== task.required) persist((c) => toggleRequired(c, task.id));
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon-xl"
                      aria-label={`Move task up: ${task.name}`}
                      className={ICON_BUTTON}
                      disabled={si === 0 && ti === 0}
                      onClick={() => persist((c) => moveTask(c, task.id, -1))}
                    >
                      <ChevronUpIcon aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xl"
                      aria-label={`Move task down: ${task.name}`}
                      className={ICON_BUTTON}
                      disabled={si === lastSection && ti === section.tasks.length - 1}
                      onClick={() => persist((c) => moveTask(c, task.id, 1))}
                    >
                      <ChevronDownIcon aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xl"
                      aria-label={`Remove task: ${task.name}`}
                      className={REMOVE_BUTTON}
                      onClick={() => setPendingRemove({ kind: "task", id: task.id, name: task.name })}
                    >
                      <XIcon aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          <div className={cn("px-4 py-3 sm:px-5", section.tasks.length > 0 && "border-t border-border/60")}>
            <Button
              variant="dashed"
              size="xl"
              className="w-full"
              onClick={() =>
                persist((c) => addTask(c, section.id, { id: crypto.randomUUID(), name: "New task", required: false }))
              }
            >
              <PlusIcon aria-hidden />
              Add task
            </Button>
          </div>
        </Card>
      ))}

      <Button
        variant="dashed"
        size="xl"
        className="w-full"
        onClick={() => persist((c) => addSection(c, { id: crypto.randomUUID(), name: "New section", tasks: [] }))}
      >
        <PlusIcon aria-hidden />
        Add section
      </Button>

      {/* Смугу збереження видно завжди: стан змін, автозбереження, результат «Save version» і помилка — поруч із дією.
          Тло — на всю ширину колонки вмісту (100cqw від центру main) і до низу сторінки (mt-auto, -mb-8 — нижній
          відступ контейнера); вміст смуги — у тій самій ширині, що й картки. */}
      <div className="sticky bottom-0 z-10 mt-auto -mb-8 ml-[calc(50%-50cqw)] w-[100cqw] border-t bg-background shadow-up">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:px-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {/* Правка вже є, навіть якщо автозбереження ще йде або впало (помилка — в Alert вище). */}
              {unpublished || saveState === "saving" || saveState === "error" ? (
                <StatusBadge data-testid="unpublished" kind="unpublished" />
              ) : (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden className="size-2 rounded-full bg-status-todo-foreground" />
                  No changes yet
                </span>
              )}
              {/* Фіксоване місце стану змін (AC-EDITOR-25): «All changes kept», «Saving…» або збій кольором помилки. */}
              <span
                data-testid="save-status"
                role={status.isError ? "alert" : "status"}
                className={status.isError ? "font-medium text-destructive" : "text-muted-foreground"}
              >
                {status.text}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/templates/${templateId}`} className={cn(buttonVariants({ variant: "outline", size: "xl" }))}>
                Close editor
              </Link>
              <Button size="xl" disabled={!unpublished || publishing} aria-busy={publishing} onClick={saveVersion}>
                {publishing ? <Loader2Icon className="motion-safe:animate-spin" aria-hidden /> : null}
                {publishing ? "Saving version…" : "Save version"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={pendingRemove !== null} onOpenChange={(open) => (open ? null : setPendingRemove(null))}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{confirmation?.title}</DialogTitle>
            <DialogDescription>{confirmation?.notice}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Назва шаблону, секції чи задачі: зберігається після паузи у введенні або при виході з поля. Порожня назва теж
// зберігається як незбережена зміна — її відхиляє «Save version» (AC-EDITOR-19, AC-EDITOR-20).
function NameField({
  id,
  label,
  value,
  className,
  onCommit,
}: {
  id?: string;
  label: string;
  value: string;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function commit(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (next.trim() !== value) onCommit(next);
  }

  return (
    <Input
      id={id}
      aria-label={id ? undefined : label}
      value={text}
      className={className ? `min-w-48 flex-1 ${className}` : "min-w-48 flex-1"}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(next), 600);
      }}
      onBlur={() => commit(text)}
    />
  );
}
