import { describe, expect, it } from "vitest";
import { analysisResultSchema } from "@/lib/ai/schemas/analysis";

describe("analysisResultSchema", () => {
  it("accepts a valid result and defaults tasks to requiring confirmation", () => {
    const r = analysisResultSchema.parse({
      language: "ar",
      summary: "s",
      items: [{ type: "task", title: "Call Ahmed" }],
    });
    const task = r.items[0]!;
    expect(task.type === "task" && task.requiresConfirmation).toBe(true);
    expect(task.type === "task" && task.dueDate).toBeNull();
  });

  it("rejects non-ISO dates instead of guessing", () => {
    expect(() =>
      analysisResultSchema.parse({
        language: "en",
        summary: "s",
        items: [{ type: "task", title: "x", dueDate: "next friday" }],
      }),
    ).toThrow();
  });

  it("rejects unknown item types", () => {
    expect(() =>
      analysisResultSchema.parse({ language: "en", summary: "s", items: [{ type: "bogus", title: "x" }] }),
    ).toThrow();
  });
});
