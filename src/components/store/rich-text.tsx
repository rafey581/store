// Renders page content written as plain text: "## " / "### " headings, "- " bullet
// lists, blank lines between paragraphs. Works line by line, so a heading may be
// followed directly by bullets. No HTML is ever interpreted (React escapes all text).

type Block = { type: "h2" | "h3" | "p"; text: string } | { type: "ul"; items: string[] };

export function parseRichText(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") });
    if (list.length) blocks.push({ type: "ul", items: list });
    para = [];
    list = [];
  };
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("### ")) {
      flush();
      blocks.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("- ")) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

export function RichText({ text, vars }: { text: string; vars?: Record<string, string> }) {
  const filled = text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars?.[k] ?? "");
  return (
    <div className="space-y-3 leading-relaxed text-gray-700">
      {parseRichText(filled).map((b, i) => {
        if (b.type === "h2") return <h2 key={i} className="pt-3 text-lg font-semibold text-gray-900">{b.text}</h2>;
        if (b.type === "h3") return <h3 key={i} className="pt-2 text-base font-semibold text-gray-900">{b.text}</h3>;
        if (b.type === "ul") return <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
        return <p key={i} className="whitespace-pre-line">{b.text}</p>;
      })}
    </div>
  );
}
