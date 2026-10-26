"use client";

import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { ROW_LINK_ROW, RowLink } from "@/components/row-link";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { matchesSearch } from "@/lib/search";
import { countLabel, versionLabel } from "@/lib/templates/format";

export type TemplateListItem = { id: string; name: string; version: number | null; unpublished: boolean };

const HEAD = "h-11 px-2 text-sm font-medium tracking-wide text-muted-foreground uppercase sm:px-4";
const CELL = "px-2 py-3 sm:px-4";

// Таблиця списку шаблонів: кількість і пошук за назвою (на клієнті, над рядками сторінки). Рядок відкривається кліком
// будь-де (RowLink); шеврон — лише іконка. Колонка статусу — лише адміністратору; на телефоні статус — під назвою.
export function TemplatesTable({ templates, showStatus }: { templates: TemplateListItem[]; showStatus: boolean }) {
  const [query, setQuery] = useState("");
  const visible = templates.filter((tpl) => matchesSearch(tpl.name, query));

  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted p-3">
        <p className="px-1 text-sm font-medium text-muted-foreground tabular-nums">
          {countLabel(templates.length, "template")}
        </p>
        <div className="relative w-full sm:w-64">
          <label htmlFor="templates-search" className="sr-only">
            Search by template name
          </label>
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="templates-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by template name"
            className="h-11 bg-background pl-9"
          />
        </div>
      </div>

      {visible.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEAD}>Template</TableHead>
              <TableHead className={HEAD}>Version</TableHead>
              {showStatus ? <TableHead className={`${HEAD} hidden sm:table-cell`}>Status</TableHead> : null}
              <TableHead className="hidden w-12 sm:table-cell">
                <span className="sr-only">Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((tpl) => (
              <TableRow key={tpl.id} data-testid="template-row" className={`${ROW_LINK_ROW} border-border/60 hover:bg-muted`}>
                <TableCell className={`${CELL} whitespace-normal`}>
                  <RowLink href={`/templates/${tpl.id}`}>{tpl.name}</RowLink>
                  {showStatus && tpl.unpublished ? (
                    <span className="mt-1 block sm:hidden">
                      <StatusBadge kind="unpublished" />
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className={CELL}>
                  {tpl.version === null ? (
                    <span className="text-sm text-muted-foreground">{versionLabel(null)}</span>
                  ) : (
                    <Badge className="h-6 bg-accent px-2.5 text-sm text-accent-foreground tabular-nums">
                      {versionLabel(tpl.version)}
                    </Badge>
                  )}
                </TableCell>
                {showStatus ? (
                  <TableCell className={`${CELL} hidden sm:table-cell`}>
                    {tpl.unpublished ? <StatusBadge kind="unpublished" /> : null}
                  </TableCell>
                ) : null}
                <TableCell className="hidden w-12 pr-4 sm:table-cell">
                  <ChevronRightIcon aria-hidden className="size-5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="px-4 py-8 text-center text-base text-muted-foreground">No templates match this search.</p>
      )}
    </div>
  );
}
