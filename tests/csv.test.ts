import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+923001234567")).toBe("'+923001234567");
    expect(csvCell("-5")).toBe("'-5");
  });
  it("builds rows", () => {
    expect(toCsv([["a", 1], [null, "x"]])).toBe("a,1\r\n,x\r\n");
  });
});
