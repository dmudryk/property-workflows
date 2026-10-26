import Link from "next/link";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireActor } from "@/lib/auth/actor";
import { staffLabel } from "@/lib/runs/rules";
import { parseContent } from "@/lib/templates/content";
import { launchRun } from "../actions";
import { LAUNCH_ERRORS, messageFor } from "../messages";
import { TemplatePicker } from "./template-picker";

// Запуск шаблону для випадку (AC-RUN-01…09): шаблон → назва випадку → виконавці задач (за замовчуванням — менеджер
// запуску, тобто «me»). Запускаємо лише поточну версію: шаблони без збереженої версії сюди не потрапляють, а
// секції й задачі — зі змісту поточної версії (impl-ws7-templates/design.md, R4; AC-EDITOR-06).
export default async function NewRunPage({ searchParams }: PageProps<"/runs/new">) {
  const { supabase, actor } = await requireActor();
  const { template, error } = await searchParams;
  const templateId = typeof template === "string" ? template : "";
  const message = messageFor(LAUNCH_ERRORS, error);

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, current_content")
    .not("current_version", "is", null)
    .order("name");

  const selected = (templates ?? []).find((t) => t.id === templateId);
  const sorted = (parseContent(selected?.current_content)?.sections ?? []).flatMap((section) =>
    section.tasks.map((task) => ({ ...task, sectionName: section.name })),
  );

  const { data: staff } = selected ? await supabase.rpc("list_staff") : { data: null };
  const others = (staff ?? []).filter((member) => member.id !== actor?.id);
  // Порожнє значення (null) — менеджер запуску (AC-RUN-08, AC-RUN-09).
  const assignees = [
    { value: null, label: "Me (run manager)" },
    ...others.map((member) => ({ value: member.id, label: staffLabel(member) })),
  ];

  const errorAlert = message ? (
    <Alert variant="destructive">
      <AlertDescription className="text-destructive">{message}</AlertDescription>
    </Alert>
  ) : null;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/runs" className="text-sm underline-offset-4 hover:underline">
          Back to runs
        </Link>
        <h1 className="text-2xl font-semibold">Launch a template</h1>
      </div>

      <Card>
        <CardContent>
          {/* key: після переходу на інший шаблон список створюється заново зі своїм defaultValue (некерований Select). */}
          <TemplatePicker
            key={selected ? templateId : ""}
            templates={(templates ?? []).map((t) => ({ id: t.id, name: t.name }))}
            selectedId={selected ? templateId : ""}
          />
        </CardContent>
      </Card>

      {selected && sorted.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Case and assignees</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={launchRun} className="flex flex-col gap-4">
              <input type="hidden" name="template_id" value={templateId} />
              {errorAlert}
              <div className="flex flex-col gap-2">
                <Label htmlFor="case_name">Case name</Label>
                <Input id="case_name" name="case_name" placeholder="Apartment 12, move-in" />
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-medium">Assignees</legend>
                {sorted.map((task) => (
                  <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Label htmlFor={`assignee-${task.id}`} className="font-normal">
                      <span className="text-muted-foreground">{task.sectionName} · </span>
                      {task.name}
                    </Label>
                    <FormSelect
                      id={`assignee-${task.id}`}
                      name={`assignee:${task.id}`}
                      items={assignees}
                      className="sm:w-64"
                    />
                  </div>
                ))}
              </fieldset>

              <SubmitButton size="lg" pendingLabel="Launching…" className="self-start">
                Launch
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : (
        errorAlert
      )}
    </main>
  );
}
