import { describe, expect, it } from "vitest";
import { runWithFallback } from "@/lib/ai/orchestration/run-with-fallback";
import { ProviderError } from "@/lib/ai/transcription/types";

describe("runWithFallback", () => {
  it("fails over to the next provider after transient errors", async () => {
    let calls = 0;
    const out = await runWithFallback([
      {
        providerId: "a",
        run: async () => {
          calls++;
          throw new ProviderError("unavailable", "down", "a");
        },
      },
      { providerId: "b", run: async () => "ok" },
    ]);
    expect(out.value).toBe("ok");
    expect(out.providerId).toBe("b");
    expect(out.failedOver).toEqual([{ providerId: "a", kind: "unavailable" }]);
    expect(calls).toBe(3); // 1 try + 2 bounded retries, no uncontrolled loop
  }, 10_000);

  it.each(["auth", "billing", "quota"] as const)("does not fail over on %s errors", async (kind) => {
    let bCalled = false;
    await expect(
      runWithFallback([
        { providerId: "a", run: async () => { throw new ProviderError(kind, "x", "a"); } },
        { providerId: "b", run: async () => { bCalled = true; return "ok"; } },
      ]),
    ).rejects.toMatchObject({ kind });
    expect(bCalled).toBe(false);
  });
});
