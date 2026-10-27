// Вибір теми (ADR 0003; AC-DSYS-05, AC-DSYS-06): «System», «Light» чи «Dark», за замовчуванням — «System». Вибір
// зберігається на пристрої — у cookie браузера, а не в профілі; сервер читає його й ставить <html data-theme>, тож
// сторінка одразу в потрібній темі, без мерехтіння й без JS. Токени теми — src/app/globals.css.
export const THEME_COOKIE = "theme";
export const THEMES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeChoice, string> = { system: "System", light: "Light", dark: "Dark" };

// Рік: вибір лишається після закриття браузера (AC-DSYS-06).
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

// Немає cookie чи незнайоме значення — «System» (AC-DSYS-05).
export function themeFromCookie(value: string | undefined): ThemeChoice {
  return isThemeChoice(value) ? value : "system";
}

// Рядок для document.cookie: стійкий (Max-Age), для всіх сторінок (Path=/), не йде на чужі сайти (SameSite=Lax).
export function themeCookie(choice: ThemeChoice): string {
  return `${THEME_COOKIE}=${choice}; Path=/; Max-Age=${THEME_MAX_AGE}; SameSite=Lax`;
}
