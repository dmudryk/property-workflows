// Куди повернути користувача після входу (AC-DSYS-08): лише відносна адреса цього ж застосунку. «//evil.example»,
// «/\evil.example», «https://…» і керівні символи — ні: інакше вхід став би відкритим перенаправленням на чужий сайт.
// Сторінку входу не повертаємо (інакше — коло). Роль перевіряє сама сторінка після входу (AC-TASK-10, AC-DSYS-02).
const BASE = "http://app.invalid";

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  // Після нормалізації «/.//evil.example» чи «/a/..//evil.example» стають «//evil.example» — адресою чужого сайту.
  if (url.origin !== BASE || url.pathname.startsWith("//")) return null;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return null;
  return `${url.pathname}${url.search}`;
}
