// Сторінки, доступні без входу. Решту proxy перенаправляє на /login (UX; дані захищають RLS і перевірки в діях) —
// AC-EDITOR-09, AC-DSYS-03. /api/health — перевірка проду (D0): без даних користувачів, читають smoke і скрипт курсу.
const PUBLIC_PATHS = ["/login", "/auth", "/api/health"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
