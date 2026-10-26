import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { progressCounts, type RunListItem } from "@/lib/runs/list";
import { newestFirst, progressLabel } from "@/lib/runs/rules";
import { requireActor } from "@/lib/auth/actor";
import { RunsTable } from "./runs-table";

// Список запусків: у кожному рядку — випадок, шаблон, статус і прогрес «N of M done» (AC-TASK-09, AC-TASK-13,
// AC-TASK-17), від найновішого (AC-TASK-14). Які запуски видно — вирішує RLS (private.can_see_run): адміністратор —
// усі; менеджер — ті, де він менеджер запуску або виконавець хоча б однієї задачі (AC-TASK-06).
export default async function RunsPage() {
  const { supabase } = await requireActor();
  const { data: rows } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, created_at, run_tasks(status)");
  const runs = newestFirst((rows ?? []).map((r) => ({ ...r, createdAt: r.created_at }))).map(
    (run): RunListItem => ({
      id: run.id,
      caseName: run.case_name,
      templateName: run.template_name,
      status: run.status === "completed" ? "completed" : "in_progress",
      ...progressCounts(run.run_tasks ?? []),
      progress: progressLabel(run.run_tasks ?? []),
    }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Runs"
        description="Every checklist launched from a template, and how far along it is."
        actions={
          <Link href="/runs/new" className={buttonVariants({ size: "xl" })}>
            <PlusIcon aria-hidden />
            Launch a template
          </Link>
        }
      />
      {runs.length > 0 ? <RunsTable runs={runs} /> : <p className="text-base text-muted-foreground">No runs yet.</p>}
    </main>
  );
}
