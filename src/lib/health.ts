// D0: чи відповіла база на запит /api/health. Чиста функція — щоб перевірити всі гілки тестом без мережі.
// Запит — публічним ключем до таблиці без доступу для anon: «немає прав» (42501) теж означає, що Postgres живий.
import type { LogSchema } from "@/lib/log";

/** Код SQLSTATE Postgres, напр. 42501 «permission denied»: запит дійшов до бази. */
const SQLSTATE = /^[0-9A-Z]{5}$/;
/** PostgREST не може під'єднатися до бази. */
const PGRST_DB_DOWN = /^PGRST00[0-3]$/;
/** Supabase відповідає 540, коли безкоштовний проєкт призупинено (Dashboard → Resume project). */
const SUPABASE_PAUSED = 540;

export type DbProbe = { status: number; error: { code?: string; message?: string } | null };
export type DbHealth = { db: "ok" | "down"; reason: string };

export function classifyDbProbe({ status, error }: DbProbe): DbHealth {
  if (status === SUPABASE_PAUSED) return { db: "down", reason: "paused" };
  const code = error?.code ?? "";
  if (!error || SQLSTATE.test(code) || (code.startsWith("PGRST") && !PGRST_DB_DOWN.test(code))) {
    return { db: "ok", reason: "" };
  }
  if (/api key/i.test(error.message ?? "")) return { db: "down", reason: "invalid-api-key" };
  // 0 — мережа (Supabase недоступний або хибний URL), 5xx, PGRST000–003.
  return { db: "down", reason: `status-${status}${code ? `-${code}` : ""}` };
}

// WS11: у якому середовищі деплой і в якій базі. На staging VERCEL_ENV теж "preview", тому назву середовища дає
// APP_ENV (лише сервер, без NEXT_PUBLIC_), а ref бази — щоб smoke і перевірка курсу бачили: staging і preview — не прод.

/** Ref проєкту Supabase — перший сегмент хоста `https://<ref>.supabase.co`. Не секрет: адреса є й у браузері. */
export function supabaseRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return /^([a-z0-9]+)\.supabase\.(co|in)$/.exec(new URL(url).hostname)?.[1] ?? null;
  } catch {
    return null;
  }
}

// Дія з postmortem docs/incidents/2026-11-23-staging-bad-key.md: збій бази на staging було видно лише як
// reason у /api/health, а runtime-журнал деплою лишився порожнім. Тепер health називає змінну, яку звірити (лише
// НАЗВУ, ніколи значення), і пише в журнал один рядок health.check — smoke і черговий бачать, куди дивитися.

/** Яку змінну середовища звірити за причиною збою бази. Лише назва; null — причина не в змінній (пауза, 5xx). */
export function suspectVariable(reason: string): string | null {
  if (reason === "invalid-api-key") return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  // status-0 — мережа не дійшла до Supabase (хибна адреса); exception — клієнт не створився (адреси немає).
  if (reason === "status-0" || reason === "exception") return "NEXT_PUBLIC_SUPABASE_URL";
  return null;
}

/** Поля рядка health.check у журналі — лише ці, кожне вузького формату (src/lib/log.ts). */
export const HEALTH_LOG_SCHEMA = {
  db: ["ok", "down"],
  reason: "token",
  suspect: "token",
  appEnv: "token",
  supabaseRef: "token",
} as const satisfies LogSchema;

export type HealthMeta = { appEnv: string | null; supabaseRef: string | null };

export function healthMeta(env: { APP_ENV?: string; NEXT_PUBLIC_SUPABASE_URL?: string }): HealthMeta {
  return { appEnv: env.APP_ENV?.trim() || null, supabaseRef: supabaseRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL) };
}
