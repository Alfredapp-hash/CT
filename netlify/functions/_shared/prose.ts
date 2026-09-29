/** Turn the desk's plain manuscript into the small set of HTML the journal uses. */
const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ESCAPE[char]);
}

function inline(value: string): string {
  let text = escapeHtml(value.trim());
  text = text.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (match, label: string, href: string) => {
    if (href.startsWith("//") || href.includes("&quot;") || href.includes("<") || href.includes("javascript:")) return match;
    return `<a href="${href}">${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

export function renderProse(source: string): string {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  if (!source.trim()) return "";
  return blocks.map((block) => {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) return "";
    if (lines.every((line) => line.startsWith("### "))) {
      return lines.map((line) => `<h3>${inline(line.slice(4))}</h3>`).join("");
    }
    if (lines.every((line) => line.startsWith("## "))) {
      return lines.map((line) => `<h2>${inline(line.slice(3))}</h2>`).join("");
    }
    if (lines.every((line) => line.startsWith("> "))) {
      return `<blockquote><p>${lines.map((line) => inline(line.slice(2))).join("<br>")}</p></blockquote>`;
    }
    return `<p>${lines.map((line) => inline(line)).join("<br>")}</p>`;
  }).join("\n");
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
