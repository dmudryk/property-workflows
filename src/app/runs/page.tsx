import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { newestFirst, progressLabel } from "@/lib/runs/rules";
import { requireActor } from "@/lib/auth/actor";

// Список запусків: у кожному рядку — випадок, шаблон, статус і прогрес «N of M done» (AC-TASK-09, AC-TASK-13,
// AC-TASK-17), від найновішого (AC-TASK-14). Які запуски видно — вирішує RLS (private.can_see_run): адміністратор —
// усі; менеджер — ті, де він менеджер запуску або виконавець хоча б однієї задачі (AC-TASK-06).
export default async function RunsPage() {
  const { supabase } = await requireActor();
  const { data: rows } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, created_at, run_tasks(status)");
  const runs = newestFirst((rows ?? []).map((r) => ({ ...r, createdAt: r.created_at })));

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Runs</h1>
        <Link href="/runs/new" className={buttonVariants({ size: "lg" })}>
          Launch a template
        </Link>
      </div>
      {runs.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead className="hidden sm:table-cell">Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} data-testid="run-row">
                  <TableCell className="whitespace-normal">
                    <Link href={`/runs/${run.id}`} className="font-medium underline-offset-4 hover:underline">
                      {run.case_name}
                    </Link>
                    <span className="block text-sm text-muted-foreground sm:hidden">{run.template_name}</span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{run.template_name}</TableCell>
                  <TableCell>
                    <StatusBadge data-testid="run-status" kind={run.status === "completed" ? "completed" : "in_progress"} />
                  </TableCell>
                  <TableCell data-testid="run-progress" className="text-right font-medium tabular-nums">
                    {progressLabel(run.run_tasks ?? [])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-base text-muted-foreground">No runs yet.</p>
      )}
    </main>
  );
}
