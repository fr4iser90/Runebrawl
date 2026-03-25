import { describe, expect, it } from "vitest";
import { PlayerProfileService } from "../auth/playerProfile.js";

describe("player profile service", () => {
  it("creates an in-memory profile and reuses existing name", async () => {
    const service = new PlayerProfileService();
    const created = await service.ensureProfile("ACC-ONE", "Alice");
    expect(created.accountId).toBe("acc-one");
    expect(created.displayName).toBe("Alice");

    const reused = await service.ensureProfile("acc-one");
    expect(reused.accountId).toBe("acc-one");
    expect(reused.displayName).toBe("Alice");
  });

  it("normalizes blank names to Guest and caps long names", async () => {
    const service = new PlayerProfileService();
    const blank = await service.updateDisplayName("acc-two", "   ");
    expect(blank.displayName).toBe("Guest");

    const longName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const updated = await service.updateDisplayName("acc-two", longName);
    expect(updated.displayName).toBe("ABCDEFGHIJKLMNOPQRSTUVWX");
  });
});

