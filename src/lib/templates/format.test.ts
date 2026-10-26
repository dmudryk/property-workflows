import { describe, expect, it } from "vitest";
import { formatKyivDateTime, templateVersionLabel, versionLabel } from "./format";

describe("template-editor: версії", () => {
  it("AC-EDITOR-05: дата й час збереження — за Києвом, DD.MM.YYYY HH:MM", () => {
    // Жовтень 2026 до 25.10 — літній час (UTC+3).
    expect(formatKyivDateTime("2026-10-12T11:05:00Z")).toBe("12.10.2026 14:05");
    expect(formatKyivDateTime("2026-10-05T06:30:00Z")).toBe("05.10.2026 09:30");
    // Після переходу на зимовий час — UTC+2; секунди відкидаються.
    expect(formatKyivDateTime("2026-12-01T07:05:59Z")).toBe("01.12.2026 09:05");
  });

  it("AC-EDITOR-06: запуск показує «Template version 1»", () => {
    expect(templateVersionLabel(1)).toBe("Template version 1");
    expect(versionLabel(2)).toBe("Version 2");
    expect(versionLabel(null)).toBe("—");
  });
});
