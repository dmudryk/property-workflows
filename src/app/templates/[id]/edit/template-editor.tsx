"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MSG_CANNOT_UNDO } from "@/lib/runs/rules";
import {
  addSection,
  addTask,
  moveSection,
  moveTask,
  removeSection,
  removeTask,
  renameSection,
  renameTask,
  toggleRequired,
  type TemplateContent,
} from "@/lib/templates/content";
import { TEMPLATE_ERRORS } from "@/lib/templates/errors";
import { versionLabel } from "@/lib/templates/format";
import { publishVersion, saveDraft } from "../../actions";

// Редактор шаблону (impl-ws7-templates/design.md, U2): кожна зміна одразу зберігається як незбережені зміни
// (AC-EDITOR-01); «Save version» створює версію (AC-EDITOR-03) або показує помилку AC-EDITOR-04 без втрати змін.
// Server Actions виконуються по черзі: «Save version» спершу дочікується останнього автозбереження.
type PendingRemove = { kind: "section" | "task"; id: string; name: string };

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
  const [content, setContent] = useState(initialContent);
  const [unpublished, setUnpublished] = useState(initiallyUnpublished);
  const [version, setVersion] = useState(currentVersion);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    // Кожна ланка черги ловить власні збої (мережа, 5xx): інакше відхилений promise зупинив би всі наступні збереження.
    queue.current = queue.current.then(async () => {
      try {
        const result = await saveDraft(templateId, next);
        if (result.ok) {
          setUnpublished(true);
          setSaveState("saved");
          setError(null);
        } else {
          setSaveState("error");
          setError(TEMPLATE_ERRORS[result.error]);
        }
      } catch {
        setSaveState("error");
        setError(TEMPLATE_ERRORS.failed);
      }
    });
  }

  // Збереження версії — теж ланка черги: спершу всі автозбереження, потім версія; правки після натискання підуть уже
  // в нові незбережені зміни.
  async function saveVersion() {
    setPublishing(true);
    setError(null);
    setNotice(null);
    const step = queue.current.then(async () => {
      try {
        const result = await publishVersion(templateId);
        if (result.ok) {
          setUnpublished(false);
          if (result.version) {
            setVersion(result.version);
            setNotice(`Version ${result.version} saved`);
          }
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
    const { kind, id } = pendingRemove;
    persist((c) => (kind === "section" ? removeSection(c, id) : removeTask(c, id)));
    setPendingRemove(null);
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/templates/${templateId}`} className="text-sm underline-offset-4 hover:underline">
          Back to the template
        </Link>
        <h1 className="text-2xl font-semibold">{name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">{versionLabel(version)}</span>
          {unpublished ? <StatusBadge data-testid="unpublished" kind="unpublished" /> : null}
          <span aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes kept" : ""}</span>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert>
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
        </Alert>
      ) : null}

      {content.sections.map((section, si) => (
        <Card key={section.id} size="sm">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <NameField
                label="Section name"
                value={section.name}
                className="text-base font-semibold"
                onCommit={(value) => persist((c) => renameSection(c, section.id, value))}
              />
              <Button variant="outline" disabled={si === 0} onClick={() => persist((c) => moveSection(c, section.id, -1))}>
                Move up
              </Button>
              <Button
                variant="outline"
                disabled={si === content.sections.length - 1}
                onClick={() => persist((c) => moveSection(c, section.id, 1))}
              >
                Move down
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPendingRemove({ kind: "section", id: section.id, name: section.name })}
              >
                Remove section
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ul className="flex flex-col divide-y">
              {section.tasks.map((task) => (
                <li key={task.id} data-testid="editor-task" className="flex flex-wrap items-center gap-2 py-2">
                  <NameField
                    label="Task name"
                    value={task.name}
                    onCommit={(value) => persist((c) => renameTask(c, task.id, value))}
                  />
                  <Button
                    variant="outline"
                    aria-pressed={task.required}
                    onClick={() => persist((c) => toggleRequired(c, task.id))}
                  >
                    {task.required ? "Required" : "Optional"}
                  </Button>
                  <Button variant="outline" onClick={() => persist((c) => moveTask(c, task.id, -1))}>
                    Move up
                  </Button>
                  <Button variant="outline" onClick={() => persist((c) => moveTask(c, task.id, 1))}>
                    Move down
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setPendingRemove({ kind: "task", id: task.id, name: task.name })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="self-start"
              onClick={() =>
                persist((c) => addTask(c, section.id, { id: crypto.randomUUID(), name: "New task", required: false }))
              }
            >
              Add task
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => persist((c) => addSection(c, { id: crypto.randomUUID(), name: "New section", tasks: [] }))}
        >
          Add section
        </Button>
        <Button size="lg" disabled={!unpublished || publishing} aria-busy={publishing} onClick={saveVersion}>
          {publishing ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
          {publishing ? "Saving version…" : "Save version"}
        </Button>
      </div>

      <Dialog open={pendingRemove !== null} onOpenChange={(open) => (open ? null : setPendingRemove(null))}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove &quot;{pendingRemove?.name}&quot;?</DialogTitle>
            <DialogDescription>{MSG_CANNOT_UNDO}</DialogDescription>
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

// Назва секції чи задачі: зберігається після паузи у введенні або при виході з поля; порожня назва не зберігається —
// поле повертає попередню (solomchaak/property-workflows-spec#28).
function NameField({
  label,
  value,
  className,
  onCommit,
}: {
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
    if (next.trim() && next.trim() !== value) onCommit(next);
  }

  return (
    <Input
      aria-label={label}
      value={text}
      className={className ? `min-w-48 flex-1 ${className}` : "min-w-48 flex-1"}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(next), 600);
      }}
      onBlur={() => {
        if (!text.trim()) setText(value);
        commit(text);
      }}
    />
  );
}
