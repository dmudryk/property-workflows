// Трекер помилок сервера (WS11, трек B): onRequestError у src/instrumentation.ts шле в Telegram маршрут-шаблон,
// метод, назву помилки, digest, середовище і верхні рядки стеку — і НІКОЛИ текст помилки (error.message), заголовки
// (cookie сесії), ?query чи абсолютні локальні шляхи. Плюс: тестовий маршрут /api/ops/error-test закрито роллю
// адміністратора. Мережі немає: fetch підмінено. Назви тестів без AC ID — це технічна перевірка, не AC.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Справжній requireActor (getClaims + роль з profiles), підроблено лише клієнт Supabase — як дозволяє правило lint.
// vi.hoisted: та сама підробка і після vi.resetModules (фабрика мока викликається наново).
const { session } = vi.hoisted(() => ({ session: { role: "manager" } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "u1", email: "someone@example.test" } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: session.role, email: null, full_name: null } }) }) }),
    }),
  }),
}));

type Handler = typeof import("@/instrumentation").onRequestError;
type Req = Parameters<Handler>[1];
type Ctx = Parameters<Handler>[2];

const USER_TEXT = "Olena olena.test@example.test 555-0103";
const request: Req = {
  path: `/runs/7d1f6c2e?note=${encodeURIComponent(USER_TEXT)}`,
  method: "POST",
  headers: { cookie: "sb-access-token=test-cookie", authorization: "Bearer test-token" },
};
const context: Ctx = { routerKind: "App Router", routePath: "/runs/[id]", routeType: "action", revalidateReason: undefined };

function errorWithStack() {
  const error = new Error(`Cannot save values for ${USER_TEXT}`);
  error.stack = [
    `Error: Cannot save values for ${USER_TEXT}`,
    // Абсолютний шлях з іменем користувача ОС має скоротитися до .next/… (на Vercel — Linux-шляхи).
    "    at saveDocumentValues (/home/someone/project/.next/server/app/runs/[id]/page.js:12:34)",
    "    at async handler (/var/task/node_modules/next/dist/server/app-render.js:1:2)",
  ].join("\n");
  return error;
}

describe("onRequestError → Telegram", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let onRequestError: Handler;

  beforeEach(async () => {
    vi.resetModules(); // свіжий модуль — свіжа пауза «та сама помилка не частіше разу на хвилину»
    fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-bot-token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "12345");
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "d5abaa5eb79ae87aa3458990375179e37f9e1732");
    ({ onRequestError } = await import("@/instrumentation"));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const sentBody = () => String((fetchMock.mock.calls[0][1] as RequestInit).body);
  const sentText = () => JSON.parse(sentBody()).text as string;

  it("надсилає маршрут-шаблон, метод, назву помилки, середовище, коміт і рядки стеку", async () => {
    await onRequestError(errorWithStack(), request, context);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const text = sentText();
    expect(text).toContain("ПОМИЛКА СЕРВЕРА");
    expect(text).toContain("Середовище: staging");
    expect(text).toContain("Маршрут: POST /runs/[id] (action, App Router)");
    expect(text).toContain("Помилка: Error");
    expect(text).toContain("коміт d5abaa5");
    expect(text).toContain("at saveDocumentValues (.next/server/app/runs/[id]/page.js:12:34)");
  });

  it("не надсилає текст помилки, cookie, заголовки, ?query і локальні шляхи", async () => {
    await onRequestError(errorWithStack(), request, context);
    const body = sentBody();
    for (const leak of ["Olena", "olena.test", "555-0103", "Cannot save values", "sb-access-token", "Bearer", "?note=", "7d1f6c2e", "someone"]) {
      expect(body).not.toContain(leak);
    }
  });

  it("та сама помилка на тому самому маршруті — не частіше разу на хвилину", async () => {
    await onRequestError(errorWithStack(), request, context);
    await onRequestError(errorWithStack(), request, context);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("без TELEGRAM_* нічого не надсилає і не падає", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    await expect(onRequestError(errorWithStack(), request, context)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("/api/ops/error-test", () => {
  it("не-адміністратору відповідає 404, наче маршруту немає", async () => {
    const { GET } = await import("@/app/api/ops/error-test/route");
    for (const role of ["manager", "vendor"]) {
      session.role = role;
      expect((await GET()).status).toBe(404);
    }
  });

  it("адміністратору кидає навмисну помилку сервера (її ловить onRequestError)", async () => {
    session.role = "admin";
    const { GET } = await import("@/app/api/ops/error-test/route");
    await expect(GET()).rejects.toThrow("ops error test");
  });
});
