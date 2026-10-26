import Link from "next/link";

// Клас рядка таблиці, який відкривається кліком будь-де (разом із RowLink у першій клітинці).
export const ROW_LINK_ROW = "group/row relative cursor-pointer";

// Посилання на весь рядок таблиці (DESIGN.md, розділ 5): псевдоелемент розтягує посилання на рядок, тож запис
// відкривається кліком будь-де в рядку, а для клавіатури й читача екрана це одне посилання з назвою запису.
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium underline-offset-4 outline-none group-hover/row:underline after:absolute after:inset-0 focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
    >
      {children}
    </Link>
  );
}
