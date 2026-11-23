// D0: /api/health відрізняє «база відповіла» від «база недоступна, призупинена чи ключ хибний».
import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";
import { classifyDbProbe, healthMeta, supabaseRefFromUrl } from "@/lib/health";

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
