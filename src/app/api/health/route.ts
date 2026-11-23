// D0: публічна перевірка здоров'я проду — GET /api/health → { ok, sha, env, appEnv, supabaseRef, db, reason, suspect }.
// appEnv і supabaseRef — WS11 (staging з окремою базою): назва середовища з APP_ENV і ref проєкту Supabase.
// suspect і рядок health.check у журналі — дія з postmortem docs/incidents/2026-11-23-staging-bad-key.md: НАЗВА
// змінної, яку звірити, коли база недоступна (ніколи значення).
// Без секретів і без даних користувачів: коміт збірки (Vercel) і чи відповідає база (один дешевий запит публічним
// ключем). Шлях — у PUBLIC_PATHS (src/lib/auth/public-paths.ts), інакше proxy віддав би 307 на /login.
// Читають: scripts/smoke.mjs, .github/workflows/smoke.yml і перевірка розгортань курсу.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { classifyDbProbe, HEALTH_LOG_SCHEMA, healthMeta, suspectVariable } from "@/lib/health";
import { logEvent } from "@/lib/log";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  // VERCEL_GIT_COMMIT_SHA є, коли у Vercel увімкнено «Automatically expose System Environment Variables» (типово так).
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const env = process.env.VERCEL_ENV ?? "local";
  const meta = healthMeta({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  let health: { db: "ok" | "down"; reason: string };
  try {
    // Звичайний supabase-js, не @/lib/supabase/server: перевірка не читає cookie відвідувача.
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    // GET, не HEAD: потрібне тіло помилки, щоб відрізнити «anon без прав» (база відповіла) від «хибний ключ».
    const { error, status } = await supabase.from("profiles").select("id").limit(1);
    health = classifyDbProbe({ status, error });
  } catch {
    health = { db: "down", reason: "exception" };
  }
  const suspect = health.db === "ok" ? null : suspectVariable(health.reason);
  // Збій бази — один рядок JSON у runtime-журналі Vercel (рівень error): без ключа, адреси й заголовків.
  if (health.db === "down") logEvent("health.check", { ...health, ...meta, suspect }, HEALTH_LOG_SCHEMA, "error");
  return NextResponse.json(
    { ok: health.db === "ok", sha, env, ...meta, ...health, suspect },
    { status: health.db === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
