import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { staffLabel } from "@/lib/runs/rules";
import { launchRun } from "../actions";
import { requireActor } from "../actor";
import { LAUNCH_ERRORS, messageFor } from "../messages";

// Запуск шаблону для випадку (AC-RUN-01…09): шаблон → назва випадку → виконавці задач (за замовчуванням — менеджер
// запуску, тобто «me»).
export default async function NewRunPage({ searchParams }: PageProps<"/runs/new">) {
  const { supabase, actor } = await requireActor();
  const { template, error } = await searchParams;
  const templateId = typeof template === "string" ? template : "";
  const message = messageFor(LAUNCH_ERRORS, error);

  const { data: templates } = await supabase.from("templates").select("id, name").order("name");

  const { data: tasks } = templateId
    ? await supabase
        .from("template_tasks")
        .select("id, name, required, position, template_sections(name, position)")
        .eq("template_id", templateId)
    : { data: null };

  const { data: staff } = templateId ? await supabase.rpc("list_staff") : { data: null };
  const others = (staff ?? []).filter((member) => member.id !== actor?.id);

  const sorted = (tasks ?? []).toSorted(
    (a, b) =>
      (a.template_sections?.position ?? 0) - (b.template_sections?.position ?? 0) || a.position - b.position,
  );

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

      {templateId && sorted.length > 0 ? (
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
                      <span className="text-muted-foreground">{task.template_sections?.name} · </span>
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
