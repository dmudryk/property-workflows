import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { requireActor } from "@/lib/auth/actor";
import { staffLabel } from "@/lib/runs/rules";
import { parseContent } from "@/lib/templates/content";
import { launchRun } from "../actions";
import { LAUNCH_ERRORS, messageFor } from "../messages";

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
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-60 flex-1 flex-col gap-2">
              <Label htmlFor="template">Template</Label>
              <NativeSelect id="template" name="template" defaultValue={templateId} className="w-full">
                <NativeSelectOption value="" disabled>
                  Choose a template
                </NativeSelectOption>
                {(templates ?? []).map((t) => (
                  <NativeSelectOption key={t.id} value={t.id}>
                    {t.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              Select
            </Button>
          </form>
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
                    <NativeSelect id={`assignee-${task.id}`} name={`assignee:${task.id}`} defaultValue="">
                      <NativeSelectOption value="">Me (run manager)</NativeSelectOption>
                      {others.map((member) => (
                        <NativeSelectOption key={member.id} value={member.id}>
                          {staffLabel(member)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                ))}
              </fieldset>

              <Button type="submit" size="lg" className="self-start">
                Launch
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        errorAlert
      )}
    </main>
  );
}
