import { PageHeader } from "@/components/page-header";
import { requireActor } from "@/lib/auth/actor";
import { staffLabel } from "@/lib/runs/rules";
import { parseContent } from "@/lib/templates/content";
import { LAUNCH_ERRORS, messageFor } from "../messages";
import { LaunchForm } from "./launch-form";

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
  const sections = parseContent(selected?.current_content)?.sections ?? [];

  const { data: staff } = selected ? await supabase.rpc("list_staff") : { data: null };
  const others = (staff ?? []).filter((member) => member.id !== actor?.id);
  // Порожнє значення (null) — менеджер запуску (AC-RUN-08, AC-RUN-09).
  const assignees = [
    { value: null, label: "Me (run manager)" },
    ...others.map((member) => ({ value: member.id, label: staffLabel(member) })),
  ];

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/runs", label: "Back to runs" }}
        title="Launch a template"
        description="Pick a template, name the case and decide who handles each task."
      />
      <LaunchForm
        templates={(templates ?? []).map((t) => ({ id: t.id, name: t.name }))}
        selectedId={selected ? templateId : ""}
        templateName={selected?.name ?? null}
        sections={sections.map((section) => ({
          id: section.id,
          name: section.name,
          tasks: section.tasks.map((task) => ({ id: task.id, name: task.name })),
        }))}
        assignees={assignees}
        error={message ?? null}
      />
    </main>
  );
}
