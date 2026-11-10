import { beforeEach, describe, expect, it, vi } from "vitest";
import { markDone } from "./actions";
import { RUN_ERRORS } from "./messages";

// Позначка задачі вендором — справжня дія markDone і справжній requireActor(); замокано лише клієнт Supabase (rpc
// повертає задані дані чи помилку, усі виклики записуються) і redirect (у Next.js він кидає виняток — тут так само,
// з адресою в тексті). Правила бази (completes_run, mark_task_done) доводить tests/db/vendor.test.ts; тут — що дія
// робить з їхньою відповіддю. Підтвердження останньої обов'язкової задачі й для вендора — припущення PM у вимозі
// solomchaak/property-workflows-spec#39 («asks for confirmation also for a vendor»).
type RpcReply = { data?: unknown; error?: { code?: string; message: string } };
const db = vi.hoisted(() => ({ rpc: {} as Record<string, RpcReply>, calls: [] as string[] }));

vi.mock("@/lib/supabase/server", () => {
  const vendorProfile = { role: "vendor", email: "vendor@example.test", full_name: null };
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: vendorProfile, error: null }),
  };
  return {
    createClient: async () => ({
      auth: { getClaims: async () => ({ data: { claims: { sub: "vendor-v" } }, error: null }) },
      from: () => query,
      rpc: async (name: string) => {
        db.calls.push(name);
        const reply = db.rpc[name] ?? {};
        return { data: reply.data ?? null, error: reply.error ?? null };
      },
    }),
  };
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const RUN_ID = "acde19d4-83ed-432b-a9e0-c75e12ab2d1e"; // «Apartment 12, move-in»

function form(taskId: string, confirmed = false) {
  const data = new FormData();
  data.set("run_id", RUN_ID);
  data.set("task_id", taskId);
  if (confirmed) data.set("confirmed", "1");
  return data;
}

beforeEach(() => {
  db.rpc = {};
  db.calls = [];
});

describe("vendor-access: позначка задачі вендором", () => {
  it("AC-VENDOR-05: задача 3 не остання обов'язкова — позначено без підтвердження, назад на сторінку запуску", async () => {
    db.rpc.completes_run = { data: false };

    await expect(markDone(form("t3"))).rejects.toThrow(`REDIRECT /runs/${RUN_ID}`);
    expect(db.calls).toEqual(["completes_run", "mark_task_done"]);
  });

  it("AC-VENDOR-05: остання обов'язкова задача вендора — спершу підтвердження «This cannot be undone», без позначки", async () => {
    db.rpc.completes_run = { data: true };

    await expect(markDone(form("t4"))).rejects.toThrow(`REDIRECT /runs/${RUN_ID}?confirm=t4`);
    expect(db.calls).not.toContain("mark_task_done");
  });

  it("AC-VENDOR-05: після підтвердження остання обов'язкова задача вендора позначається без повторної перевірки", async () => {
    await expect(markDone(form("t4", true))).rejects.toThrow(`REDIRECT /runs/${RUN_ID}`);
    expect(db.calls).toEqual(["mark_task_done"]);
  });

  it("AC-VENDOR-05: збій перевірки completes_run — задачу не позначено, повідомлення «The task could not be marked as done. Try again.»", async () => {
    db.rpc.completes_run = { error: { message: "fetch failed" } };

    await expect(markDone(form("t4"))).rejects.toThrow(`REDIRECT /runs/${RUN_ID}?error=failed`);
    expect(db.calls).not.toContain("mark_task_done");
    expect(RUN_ERRORS.failed).toBe("The task could not be marked as done. Try again.");
  });
});
