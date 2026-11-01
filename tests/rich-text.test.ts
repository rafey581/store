import { describe, expect, it } from "vitest";
import { parseRichText } from "@/components/store/rich-text";

describe("parseRichText", () => {
  it("handles headings followed directly by bullets", () => {
    expect(parseRichText("Intro line\n\n## Promise\n- Fast\n- Safe\nAfter list")).toEqual([
      { type: "p", text: "Intro line" },
      { type: "h2", text: "Promise" },
      { type: "ul", items: ["Fast", "Safe"] },
      { type: "p", text: "After list" },
    ]);
  });
  it("keeps multi-line paragraphs and h3", () => {
    expect(parseRichText("a\nb\n\n### Small")).toEqual([{ type: "p", text: "a\nb" }, { type: "h3", text: "Small" }]);
  });
});
