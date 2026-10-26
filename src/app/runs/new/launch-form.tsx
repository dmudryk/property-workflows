"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Chip } from "@/components/chip";
import { FormSelect, type FormSelectItem } from "@/components/form-select";
import { NumberBadge } from "@/components/number-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { countLabel } from "@/lib/templates/format";
import { launchRun } from "../actions";
import { TemplatePicker } from "./template-picker";

type LaunchSection = { id: string; name: string; tasks: { id: string; name: string }[] };

// Форма запуску (AC-RUN-01…09) у дві колонки: ліворуч — три кроки (шаблон, випадок, виконавці за секціями),
// праворуч — підсумок із кнопкою запуску. Поля й дія ті самі: template_id, case_name, assignee:<id задачі>
// (порожнє — менеджер запуску) → launchRun. Стан тут — для підсумку (назва випадку й кількість задач «на мені») і
// для перемикання шаблону (поки воно триває, запуск вимкнено).
export function LaunchForm({
  templates,
  selectedId,
  templateName,
  sections,
  assignees,
  error,
}: {
  templates: { id: string; name: string }[];
  selectedId: string;
  templateName: string | null;
  sections: LaunchSection[];
  assignees: FormSelectItem[];
  error: string | null;
}) {
  const [caseName, setCaseName] = useState("");
  const [picks, setPicks] = useState<Record<string, string | null>>({});
  // Перемикання шаблону: до кінця переходу форма ще тримає задачі й template_id попереднього — запуск вимкнено.
  const [switching, startSwitch] = useTransition();
  const tasks = sections.flatMap((section) => section.tasks);
  const ready = Boolean(selectedId) && tasks.length > 0;
  const mine = tasks.filter((task) => (picks[task.id] ?? null) === null).length;
  let number = 0;

  return (
    <form
      action={launchRun}
      onReset={() => {
        setCaseName("");
        setPicks({});
      }}
      className="flex flex-wrap items-start gap-6"
    >
      {ready ? <input type="hidden" name="template_id" value={selectedId} /> : null}

      <div className="flex min-w-0 flex-[999_1_28rem] flex-col gap-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        ) : null}

        <StepCard step={1} title="Template">
          <TemplatePicker
            templates={templates}
            selectedId={selectedId}
            pending={switching}
            startTransition={startSwitch}
          />
          {selectedId ? (
            <div className="flex flex-wrap gap-2">
              <Chip>{countLabel(tasks.length, "task")}</Chip>
              <Chip>
                {countLabel(sections.length, "section")}
                {sections.length > 0 ? `: ${sections.map((section) => section.name).join(", ")}` : ""}
              </Chip>
            </div>
          ) : null}
        </StepCard>

        {ready ? (
          <>
            <StepCard step={2} title="Case">
              <div className="flex flex-col gap-2">
                <Label htmlFor="case_name">Case name</Label>
                <Input
                  id="case_name"
                  name="case_name"
                  placeholder="Apartment 12, move-in"
                  aria-required="true"
                  aria-describedby="case_name-hint"
                  className="h-11"
                  onChange={(e) => setCaseName(e.target.value)}
                />
                <p id="case_name-hint" className="text-sm text-muted-foreground">
                  Shown in the runs list, so make it easy to recognise.
                </p>
              </div>
            </StepCard>

            <StepCard step={3} title="Assignees" hint="Defaults to you as run manager">
              <div className="flex flex-col gap-5">
                {sections.map((section) =>
                  section.tasks.length > 0 ? (
                    <fieldset key={section.id} className="flex min-w-0 flex-col">
                      <legend className="mb-1 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        {section.name}
                      </legend>
                      <ul className="flex flex-col divide-y">
                        {section.tasks.map((task) => (
                          <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                            <NumberBadge size="sm">{++number}</NumberBadge>
                            <Label htmlFor={`assignee-${task.id}`} className="min-w-32 flex-1 font-normal">
                              {task.name}
                            </Label>
                            <FormSelect
                              id={`assignee-${task.id}`}
                              name={`assignee:${task.id}`}
                              items={assignees}
                              size="lg"
                              className="sm:w-60"
                              onValueChange={(value) => setPicks((current) => ({ ...current, [task.id]: value }))}
                            />
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  ) : null,
                )}
              </div>
            </StepCard>
          </>
        ) : null}
      </div>

      <section
        aria-labelledby="launch-summary-title"
        className="flex min-w-0 flex-[1_1_20rem] flex-col gap-4 rounded-xl border bg-muted p-5"
      >
        <h2 id="launch-summary-title" className="text-lg font-semibold">
          Summary
        </h2>
        <dl className="flex flex-col gap-3 text-sm">
          <SummaryRow term="Template">{templateName ?? "—"}</SummaryRow>
          <SummaryRow term="Case">{caseName.trim() || "—"}</SummaryRow>
          <SummaryRow term="Tasks">{ready ? tasks.length : "—"}</SummaryRow>
          <SummaryRow term="Assigned to you">{ready ? `${mine} of ${tasks.length}` : "—"}</SummaryRow>
        </dl>
        <div className="flex flex-col gap-3">
          <SubmitButton size="xl" pendingLabel="Launching…" disabled={!ready || switching} className="w-full">
            Launch run
            <ArrowRightIcon data-icon="inline-end" aria-hidden />
          </SubmitButton>
          <Link href="/runs" className={cn(buttonVariants({ variant: "outline", size: "xl" }), "w-full")}>
            Cancel
          </Link>
        </div>
      </section>
    </form>
  );
}

function StepCard({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-background [--card-spacing:--spacing(5)]">
      <CardHeader className="flex flex-wrap items-center gap-3">
        <NumberBadge>{step}</NumberBadge>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground sm:ml-auto">{hint}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function SummaryRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className="min-w-0 text-right font-medium break-words tabular-nums">{children}</dd>
    </div>
  );
}
