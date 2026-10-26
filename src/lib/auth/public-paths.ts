// Сторінки, доступні без входу. Решту proxy перенаправляє на /login (UX; дані захищають RLS і перевірки в діях) —
// AC-EDITOR-09, AC-DSYS-03.
const PUBLIC_PATHS = ["/login", "/auth"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
