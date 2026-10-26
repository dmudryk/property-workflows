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

// «Template version N» на сторінці запуску (AC-EDITOR-06).
export function templateVersionLabel(version: number): string {
  return `Template version ${version}`;
}

// «Version N» у списках шаблонів і версій.
export function versionLabel(version: number | null): string {
  return version === null ? "—" : `Version ${version}`;
}
