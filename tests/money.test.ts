import { describe, expect, it } from "vitest";
import { formatPKR, rupeesToPaisa, paisaToRupeeInput } from "@/lib/money";

describe("money", () => {
  it("formats paisa as PKR", () => {
    expect(formatPKR(125000)).toBe("Rs 1,250");
    expect(formatPKR(125050)).toBe("Rs 1,250.50");
    expect(formatPKR(0)).toBe("Rs 0");
    expect(formatPKR(-5000)).toBe("-Rs 50");
  });
  it("rejects non-integer paisa", () => {
    expect(() => formatPKR(10.5)).toThrow();
  });
  it("parses rupee input without floating point errors", () => {
    expect(rupeesToPaisa("1250")).toBe(125000);
    expect(rupeesToPaisa("1,250.5")).toBe(125050);
    expect(rupeesToPaisa("0.29")).toBe(29);
    expect(rupeesToPaisa("19.99")).toBe(1999);
    expect(rupeesToPaisa("abc")).toBeNull();
    expect(rupeesToPaisa("-5")).toBeNull();
    expect(rupeesToPaisa("1.234")).toBeNull();
    expect(rupeesToPaisa("")).toBeNull();
  });
  it("round-trips form values", () => {
    expect(paisaToRupeeInput(125050)).toBe("1250.50");
    expect(paisaToRupeeInput(125000)).toBe("1250");
    expect(paisaToRupeeInput(null)).toBe("");
  });
});
