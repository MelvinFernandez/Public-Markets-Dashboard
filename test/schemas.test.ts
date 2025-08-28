import { describe, it, expect } from "vitest";
import { QuoteSchema, NewsItemSchema, Form4Schema } from "../src/lib/schemas";

describe("schemas", () => {
  it("validates quote", () => {
    const r = QuoteSchema.parse({ symbol: "AAPL", price: 100, change: 1, changePercent: 1, history: [], updatedAt: Date.now() });
    expect(r.symbol).toBe("AAPL");
  });
  it("validates news", () => {
    const r = NewsItemSchema.parse({ title: "t", url: "https://x.com", source: "s", polarity: 0 });
    expect(r.url).toContain("https");
  });
  it("validates form4", () => {
    const r = Form4Schema.parse({ company: "c", symbol: "AAPL", ownerName: "o", transactionCode: "P", shares: 1, price: 1, filingUrl: "https://sec.gov", filingDate: "2024-01-01" });
    expect(r.transactionCode).toBe("P");
  });
});


