import { describe, it, expect } from "vitest";
import { fetchNews, fetchQuotes } from "../src/lib/adapters/index";

describe("adapters", () => {
  it("returns quotes for symbols", async () => {
    const rows = await fetchQuotes(["AAPL", "MSFT"]);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].symbol).toBeDefined();
  });
  it("returns news items (shape)", async () => {
    const items = await fetchNews();
    expect(Array.isArray(items)).toBe(true);
    if (items.length > 0) {
      expect(items[0].url).toMatch(/^https?:\/\//);
    }
  });
});
