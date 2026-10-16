// Versioned content stays in the existing agreementContent field.
export const RICH_AGREEMENT = "<!--werkly-agreement-v1-->";
export const isRichAgreement = (value: string) => value.startsWith(RICH_AGREEMENT);
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function agreementHtml(value: string) {
  const source = isRichAgreement(value) ? value.slice(RICH_AGREEMENT.length) : value.split(/\n\n/).map(p => `<p>${escape(p).replaceAll("\n", "<br>")}</p>`).join("");
  const doc = new DOMParser().parseFromString(source, "text/html");
  const clean = (node: Node): string => {
    if (node.nodeType === 3) return escape(node.textContent || "");
    if (!(node instanceof Element)) return "";
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "IMG"].includes(node.tagName)) return "";
    const children = Array.from(node.childNodes).map(clean).join("");
    if (!["P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "SPAN", "FONT", "H1", "H2", "H3", "UL", "OL", "LI"].includes(node.tagName)) return children;
    const el = node as HTMLElement;
    const styles: string[] = [];
    if (["left", "center", "right", "justify"].includes(el.style.textAlign)) styles.push(`text-align:${el.style.textAlign}`);
    if (/^(bold|[6-9]00)$/.test(el.style.fontWeight)) styles.push("font-weight:bold");
    if (el.style.fontStyle === "italic") styles.push("font-style:italic");
    if (el.style.textDecoration.includes("underline")) styles.push("text-decoration:underline");
    const size = parseFloat(el.style.fontSize);
    if (size && /(?:px|pt)$/.test(el.style.fontSize)) styles.push(`font-size:${Math.max(8, Math.min(32, size * (el.style.fontSize.endsWith("px") ? .75 : 1)))}pt`);
    const fontSize = node.tagName === "FONT" ? Number(node.getAttribute("size")) : 0;
    if (fontSize >= 1 && fontSize <= 7) styles.push(`font-size:${[8, 10, 12, 14, 18, 24, 32][fontSize - 1]}pt`);
    const tag = node.tagName === "FONT" ? "span" : node.tagName.toLowerCase();
    return `<${tag}${styles.length ? ` style="${styles.join(";")}"` : ""}>${children}${tag === "br" ? "" : `</${tag}>`}`;
  };
  return Array.from(doc.body.childNodes).map(clean).join("");
}

export type AgreementRun = { text: string; bold: boolean; italic: boolean; underline: boolean; size: number };
export type AgreementBlock = { runs: AgreementRun[]; align: string };
export function agreementBlocks(value: string): AgreementBlock[] {
  const doc = new DOMParser().parseFromString(agreementHtml(value), "text/html");
  const blocks: AgreementBlock[] = [];
  let current: AgreementBlock = { runs: [], align: "left" };
  const flush = () => { if (current.runs.length) blocks.push(current); current = { runs: [], align: "left" }; };
  const visit = (node: Node, style: Omit<AgreementRun, "text">, align: string) => {
    if (node.nodeType === 3) { current.align = align; current.runs.push({ ...style, text: node.textContent || "" }); return; }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    const block = ["P", "DIV", "H1", "H2", "H3", "LI"].includes(tag);
    if (block || tag === "BR") flush();
    const next = { bold: style.bold || ["B", "STRONG", "H1", "H2", "H3"].includes(tag) || node.style.fontWeight === "bold", italic: style.italic || ["I", "EM"].includes(tag) || node.style.fontStyle === "italic", underline: style.underline || tag === "U" || node.style.textDecoration.includes("underline"), size: parseFloat(node.style.fontSize) || ({ H1: 24, H2: 18, H3: 14 }[tag] || style.size) };
    const nextAlign = node.style.textAlign || align;
    if (tag === "LI") { const index = Array.from(node.parentElement!.children).indexOf(node) + 1; current.runs.push({ ...next, text: node.parentElement?.tagName === "OL" ? `${index}. ` : "• " }); }
    node.childNodes.forEach(child => visit(child, next, nextAlign));
    if (block) flush();
  };
  doc.body.childNodes.forEach(node => visit(node, { bold: false, italic: false, underline: false, size: 11.5 }, "left"));
  flush();
  return blocks;
}
