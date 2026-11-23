// D0: /api/health відрізняє «база відповіла» від «база недоступна, призупинена чи ключ хибний».
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";
import { classifyDbProbe, healthMeta, supabaseRefFromUrl, suspectVariable } from "@/lib/health";

// Відповідь бази для тесту маршруту: підроблено лише зовнішній клієнт supabase-js (мережі немає).
const { probe } = vi.hoisted(() => ({ probe: { status: 200, error: null as { code?: string; message?: string } | null } }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ select: () => ({ limit: async () => ({ status: probe.status, error: probe.error }) }) }) }),
}));

describe("/api/health без входу", () => {
  it("proxy не веде /api/health на сторінку входу, а схожі шляхи — веде", () => {
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/api/healthz")).toBe(false);
    expect(isPublicPath("/api")).toBe(false);
  });
});

describe("classifyDbProbe (/api/health)", () => {
  it("рахує базу живою, коли запит пройшов або Postgres відмовив у правах (42501)", () => {
    expect(classifyDbProbe({ status: 200, error: null })).toEqual({ db: "ok", reason: "" });
    expect(classifyDbProbe({ status: 401, error: { code: "42501", message: "permission denied for table profiles" } })).toEqual({
      db: "ok",
      reason: "",
    });
    expect(classifyDbProbe({ status: 400, error: { code: "PGRST100", message: "bad filter" } }).db).toBe("ok");
  });

  it("повідомляє «paused», коли Supabase відповідає 540 (безкоштовний проєкт призупинено)", () => {
    expect(classifyDbProbe({ status: 540, error: { message: "project paused" } })).toEqual({ db: "down", reason: "paused" });
  });

  it("повідомляє про хибний публічний ключ", () => {
    expect(classifyDbProbe({ status: 401, error: { message: "Invalid API key" } })).toEqual({
      db: "down",
      reason: "invalid-api-key",
    });
  });

  it("повідомляє код, коли PostgREST не дістає до бази або мережі немає", () => {
    expect(classifyDbProbe({ status: 503, error: { code: "PGRST002", message: "schema cache" } })).toEqual({
      db: "down",
      reason: "status-503-PGRST002",
    });
    expect(classifyDbProbe({ status: 0, error: { message: "fetch failed" } })).toEqual({ db: "down", reason: "status-0" });
  });
});

describe("healthMeta (/api/health: середовище й база, WS11)", () => {
  it("бере назву середовища з APP_ENV і ref проєкту з адреси Supabase", () => {
    expect(
      healthMeta({ APP_ENV: "staging", NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" }),
    ).toEqual({ appEnv: "staging", supabaseRef: "abcdefghijklmnopqrst" });
  });

  it("без APP_ENV (прод) — appEnv null, ref бази все одно видно", () => {
    expect(healthMeta({ NEXT_PUBLIC_SUPABASE_URL: "https://prodref123.supabase.co/" })).toEqual({
      appEnv: null,
      supabaseRef: "prodref123",
    });
    expect(healthMeta({ APP_ENV: "  ", NEXT_PUBLIC_SUPABASE_URL: undefined })).toEqual({ appEnv: null, supabaseRef: null });
  });

  it("не вигадує ref для адреси не Supabase, локальної бази чи зламаного значення", () => {
    expect(supabaseRefFromUrl("http://127.0.0.1:54321")).toBeNull();
    expect(supabaseRefFromUrl("https://example.test")).toBeNull();
    expect(supabaseRefFromUrl("https://abc.supabase.co.evil.test")).toBeNull();
    expect(supabaseRefFromUrl("not a url")).toBeNull();
    expect(supabaseRefFromUrl("")).toBeNull();
  });
});

// Дія з postmortem docs/incidents/2026-11-23-staging-bad-key.md: на хибний ключ staging health відповідав 503, але
// runtime-журнал деплою лишився порожнім, а у відповіді не було назви змінної. Ці тести червоніють на старому коді.
describe("suspectVariable (/api/health: яку змінну звірити)", () => {
  it("називає змінну за причиною збою — лише назву", () => {
    expect(suspectVariable("invalid-api-key")).toBe("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(suspectVariable("status-0")).toBe("NEXT_PUBLIC_SUPABASE_URL");
    expect(suspectVariable("exception")).toBe("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("не звинувачує змінну, коли причина не в ній (пауза, 5xx від бази)", () => {
    expect(suspectVariable("paused")).toBeNull();
    expect(suspectVariable("status-503-PGRST002")).toBeNull();
  });
});

describe("GET /api/health", () => {
  const KEY = "sb_publishable_drill_marker_value";
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://pqptodzkewlakfzumoos.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", KEY);
    vi.stubEnv("APP_ENV", "staging");
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("хибний ключ: 503, назва змінної у відповіді й один рядок health.check у журналі — без значення ключа", async () => {
    probe.status = 401;
    probe.error = { message: "Invalid API key" };
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, db: "down", reason: "invalid-api-key", suspect: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", appEnv: "staging" });

    expect(error).toHaveBeenCalledTimes(1);
    const line = String(error.mock.calls[0][0]);
    expect(JSON.parse(line)).toMatchObject({
      event: "health.check",
      db: "down",
      reason: "invalid-api-key",
      suspect: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      appEnv: "staging",
      supabaseRef: "pqptodzkewlakfzumoos",
    });
    expect(line + JSON.stringify(body)).not.toContain(KEY);
  });

  it("база відповідає: 200, suspect null і журнал мовчить", async () => {
    probe.status = 200;
    probe.error = null;
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, db: "ok", suspect: null });
    expect(error).not.toHaveBeenCalled();
  });
});
