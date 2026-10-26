import { describe, expect, it } from "vitest";
import { countByStatus, filterRuns, progressCounts, progressPercent } from "./list";

const runs = [
  { id: "1", caseName: "Apartment 12, move-in", status: "in_progress" as const },
  { id: "2", caseName: "Apartment 15, move-in", status: "completed" as const },
  { id: "3", caseName: "House 4, move-out", status: "in_progress" as const },
];

describe("список запусків: фільтр, пошук і смуга прогресу", () => {
  it("рахує запуски за статусом для вкладок фільтра", () => {
    expect(countByStatus(runs)).toEqual({ all: 3, in_progress: 2, completed: 1 });
    expect(countByStatus([])).toEqual({ all: 0, in_progress: 0, completed: 0 });
  });

  it("фільтрує за статусом і шукає підрядок назви випадку без урахування регістру", () => {
    expect(filterRuns(runs, "all", "").map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(filterRuns(runs, "completed", "").map((r) => r.id)).toEqual(["2"]);
    expect(filterRuns(runs, "all", "  apartment ").map((r) => r.id)).toEqual(["1", "2"]);
    expect(filterRuns(runs, "in_progress", "MOVE-OUT").map((r) => r.id)).toEqual(["3"]);
    expect(filterRuns(runs, "completed", "house")).toEqual([]);
  });

  it("смуга прогресу — частка задач «done» серед усіх задач запуску", () => {
    const counts = progressCounts([{ status: "done" }, { status: "to_do" }, { status: "done" }, { status: "to_do" }, { status: "to_do" }]);
    expect(counts).toEqual({ done: 2, total: 5 });
    expect(progressPercent(counts)).toBe(40);
    expect(progressPercent({ done: 1, total: 3 })).toBe(33);
    expect(progressPercent({ done: 0, total: 0 })).toBe(0);
  });
});
