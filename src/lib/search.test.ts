import { describe, expect, it } from "vitest";
import { matchesSearch } from "./search";

describe("пошук у списках", () => {
  it("підрядок без урахування регістру; пробіли на краях запиту й порожній запит не обмежують", () => {
    expect(matchesSearch("Tenant move-in", "MOVE")).toBe(true);
    expect(matchesSearch("Tenant move-in", "  tenant ")).toBe(true);
    expect(matchesSearch("Tenant move-in", "")).toBe(true);
    expect(matchesSearch("Tenant move-in", "   ")).toBe(true);
    expect(matchesSearch("Repair", "move")).toBe(false);
  });
});
