// Дата й час у списку версій — за Києвом, DD.MM.YYYY HH:MM, з точністю до хвилини (AC-EDITOR-05).
// timeZone обов'язковий: сервер Vercel працює в UTC.
const kyiv = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Kyiv",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatKyivDateTime(value: string | Date): string {
  const parts = Object.fromEntries(kyiv.formatToParts(new Date(value)).map((p) => [p.type, p.value]));
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

// Дата й час збереженого документа запуску — за Києвом, як у прикладі PM «12 Nov 2026, 10:15» (AC-DOCAI-04). Місяць —
// з власного списку, а не з Intl: ICU різних версій пише вересень то «Sep», то «Sept».
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatKyivRecordDateTime(value: string | Date): string {
  const parts = Object.fromEntries(kyiv.formatToParts(new Date(value)).map((p) => [p.type, p.value]));
  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

// «Template version N» на сторінці запуску (AC-EDITOR-06).
export function templateVersionLabel(version: number): string {
  return `Template version ${version}`;
}

// Кількість зі словом у чипах: «1 task», «5 tasks», «2 sections».
export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// «Version N» у списках шаблонів і версій.
export function versionLabel(version: number | null): string {
  return version === null ? "—" : `Version ${version}`;
}
