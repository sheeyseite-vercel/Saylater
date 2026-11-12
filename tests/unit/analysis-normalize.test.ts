import { describe, expect, it } from "vitest";
import { foldText, normalizeAnalysis } from "@/features/ai-analysis/normalize";
import { isoInTimezone, safeTimezone } from "@/features/ai-analysis/time";

const transcript = "غدا لازم أتصل بأحمد الساعة الخامسة، وأشتري حليب وخبز.";
const base = {
  type: "task", title: "اتصل بأحمد", description: "", inferred: false, evidence: "لازم أتصل بأحمد",
  priority: null, dueDate: null, remindAt: null, startsAt: null, endsAt: null, tags: [], listItems: [],
};
const wrap = (items: unknown[]) => ({ language: "ar", summary: "ملخص", clarifications: [], items });

describe("normalizeAnalysis", () => {
  it("keeps a real verbatim quote", () => {
    const r = normalizeAnalysis(wrap([base]), transcript);
    expect(r.items[0]).toMatchObject({ evidence: "لازم أتصل بأحمد", inferred: false });
  });

  it("drops an invented quote and flags the item as inferred", () => {
    const r = normalizeAnalysis(wrap([{ ...base, evidence: "اتصل بسارة غدا" }]), transcript);
    expect(r.items[0]).toMatchObject({ evidence: null, inferred: true });
  });

  it("nulls malformed dates instead of guessing and requires confirmation for valid ones", () => {
    const bad = normalizeAnalysis(wrap([{ ...base, dueDate: "tomorrow" }]), transcript);
    expect(bad.items[0]).toMatchObject({ dueDate: null, dueDateNeedsConfirmation: false });
    const ok = normalizeAnalysis(wrap([{ ...base, dueDate: "2026-11-13T17:00:00+01:00" }]), transcript);
    expect(ok.items[0]).toMatchObject({ dueDateNeedsConfirmation: true });
  });

  it("turns an empty shopping list into a note", () => {
    const r = normalizeAnalysis(wrap([{ ...base, type: "shopping_list" }]), transcript);
    expect(r.items[0]?.type).toBe("note");
  });

  it("keeps content for unknown types as notes", () => {
    const r = normalizeAnalysis(wrap([{ ...base, type: "weird" }]), transcript);
    expect(r.items[0]?.type).toBe("note");
  });

  it("always requires confirmation for reminders and events", () => {
    const r = normalizeAnalysis(wrap([{ ...base, type: "reminder" }, { ...base, type: "event" }]), transcript);
    expect(r.items.every((i) => "needsConfirmation" in i && i.needsConfirmation)).toBe(true);
  });

  it("rejects structurally invalid output", () => {
    expect(() => normalizeAnalysis({ foo: 1 }, transcript)).toThrow();
  });
});

describe("foldText", () => {
  it("ignores diacritics, tatweel and punctuation", () => {
    expect(foldText("أَتّصِـل، بأحمد!")).toBe(foldText("أتصل بأحمد"));
  });
});

describe("time helpers", () => {
  it("formats with a numeric offset", () => {
    expect(isoInTimezone(new Date("2026-11-12T12:00:00Z"), "Africa/Algiers")).toBe("2026-11-12T13:00:00+01:00");
    expect(isoInTimezone(new Date("2026-11-12T12:00:00Z"), "UTC")).toMatch(/\+00:00$/);
  });
  it("falls back to UTC for invalid zones", () => {
    expect(safeTimezone("Mars/Base")).toBe("UTC");
    expect(safeTimezone(42)).toBe("UTC");
  });
});
