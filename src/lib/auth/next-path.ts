// Куди повернути користувача після входу (AC-DSYS-08): лише відносна адреса цього ж застосунку. «//evil.example»,
// «/\evil.example», «https://…» і керівні символи — ні: інакше вхід став би відкритим перенаправленням на чужий сайт.
// Сторінку входу не повертаємо (інакше — коло). Роль перевіряє сама сторінка після входу (AC-TASK-10, AC-DSYS-02).
const BASE = "http://app.invalid";

// «//host» і «/\host» браузер читає як адресу іншого сайту, хоч вони й починаються зі «/».
function isOtherSite(path: string): boolean {
  return path.startsWith("//") || path.startsWith("/\\");
}

function isSignInPage(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || isOtherSite(value)) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  // Після нормалізації «/.//evil.example» чи «/a/..//evil.example» стають «//evil.example» — адресою чужого сайту.
  if (url.origin !== BASE || isOtherSite(url.pathname)) return null;
  if (isSignInPage(url.pathname)) return null;
  return `${url.pathname}${url.search}`;
}
