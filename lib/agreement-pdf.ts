import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage } from "pdf-lib";
import { agreementBlocks, isRichAgreement, type AgreementRun } from "./agreement-format";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const SIDE_MARGIN = 42;
const CONTENT_TOP = 704;
const CONTENT_BOTTOM = 72;
const BODY_SIZE = 11.5;
const LINE_HEIGHT = 20;

const SECTION_HEADINGS = new Set([
  "Scope of Services",
  "Fee Structure",
  "Candidate Ownership",
  "Replacement Policy",
  "Payment Terms",
  "Confidentiality",
  "Non-Solicitation",
  "Jurisdiction",
]);

function printableText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replaceAll("\t", "    ")
    .replaceAll("₹", "Rs. ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u2022]/g, "");
}

function wrapText(text: string, maxWidth: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number) {
  const lines: string[] = [];
  for (const sourceLine of printableText(text).split("\n")) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function fetchBytes(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load agreement asset: ${path}`);
  return response.arrayBuffer();
}

function drawPageBranding(page: PDFPage, letterhead: PDFImage, footer: PDFImage) {
  const headerScale = (PAGE_WIDTH - 28) / letterhead.width;
  const footerScale = (PAGE_WIDTH - 28) / footer.width;
  page.drawImage(letterhead, {
    x: 14,
    y: PAGE_HEIGHT - letterhead.height * headerScale - 8,
    width: letterhead.width * headerScale,
    height: letterhead.height * headerScale,
  });
  page.drawImage(footer, {
    x: 14,
    y: 8,
    width: footer.width * footerScale,
    height: footer.height * footerScale,
  });
}

export async function generateAgreementPdf(agreementContent: string, partyNames: string[] = []) {
  const [letterheadBytes, footerBytes, signatureBytes] = await Promise.all([
    fetchBytes("/agreement-assets/letterhead.png"),
    fetchBytes("/agreement-assets/footer.png"),
    fetchBytes("/agreement-assets/signature.png"),
  ]);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const letterhead = await pdf.embedPng(letterheadBytes);
  const footer = await pdf.embedPng(footerBytes);
  const signature = await pdf.embedPng(signatureBytes);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageBranding(page, letterhead, footer);
  let y = CONTENT_TOP;

  const nextPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBranding(page, letterhead, footer);
    y = CONTENT_TOP;
  };
  const requireSpace = (height: number) => {
    if (y - height < CONTENT_BOTTOM) nextPage();
  };

  const richBlocks = isRichAgreement(agreementContent) ? agreementBlocks(agreementContent) : null;
  const paragraphs = richBlocks ? richBlocks.map(block => block.runs.map(run => run.text).join("").trim()) : agreementContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const isWerklySignature = (value: string) => /^For\s+(?:and\s+on\s+behalf\s+of\s+)?Werkly\b[^\n]*$/i.test(value.trim());
  // Edited drafts may omit the original sign-off. Always retain a signing area
  // in the generated agreement; this does not modify uploaded signed documents.
  if (!paragraphs.some(isWerklySignature)) {
    paragraphs.push(`For ${partyNames[0] || "Werkly Consulting Private Limited"}`, "Authorized Signatory", `For ${partyNames[1] || "Client"}`, "Authorized Signatory");
  }

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    if (isWerklySignature(paragraph)) {
      const clientSignatoryIndex = paragraphs.findIndex(
        (value, candidateIndex) => candidateIndex > index && value.startsWith("For ") && value !== paragraph
      );
      const clientSignatory = clientSignatoryIndex > index ? paragraphs[clientSignatoryIndex] : "For Client";
      const columnGap = 36;
      const columnWidth = (PAGE_WIDTH - SIDE_MARGIN * 2 - columnGap) / 2;
      const rightX = SIDE_MARGIN + columnWidth + columnGap;
      const leftLines = wrapText(paragraph, columnWidth, bold, BODY_SIZE);
      const rightLines = wrapText(clientSignatory, columnWidth, bold, BODY_SIZE);
      const headingHeight = Math.max(leftLines.length, rightLines.length) * LINE_HEIGHT;
      const signatureWidth = 118;
      const signatureHeight = (signature.height / signature.width) * signatureWidth;
      const signingSpace = Math.max(64, signatureHeight + 16);
      requireSpace(headingHeight + signingSpace + 48);
      y -= 16;
      for (const [lines, x] of [[leftLines, SIDE_MARGIN], [rightLines, rightX]] as const) {
        lines.forEach((line, lineIndex) => page.drawText(line, {
          x, y: y - lineIndex * LINE_HEIGHT, size: BODY_SIZE, font: bold,
          color: rgb(0.06, 0.18, 0.22),
        }));
      }
      const signatureTop = y - headingHeight;
      const labelY = signatureTop - signingSpace;
      page.drawImage(signature, {
        x: SIDE_MARGIN,
        y: signatureTop - signatureHeight - 8,
        width: signatureWidth,
        height: signatureHeight,
      });
      page.drawText("Authorized Signatory", {
        x: SIDE_MARGIN,
        y: labelY,
        size: BODY_SIZE,
        font: regular,
        color: rgb(0.06, 0.18, 0.22),
      });
      page.drawText("Authorized Signatory", {
        x: rightX,
        y: labelY,
        size: BODY_SIZE,
        font: regular,
        color: rgb(0.06, 0.18, 0.22),
      });
      y = labelY - 24;
      if (clientSignatoryIndex > index) {
        index = clientSignatoryIndex;
        while (paragraphs[index + 1] === "Authorized Signatory") index += 1;
      } else {
        while (paragraphs[index + 1] === "Authorized Signatory") index += 1;
      }
      continue;
    }

    if (richBlocks) {
      const block = richBlocks[index];
      const maxWidth = PAGE_WIDTH - SIDE_MARGIN * 2;
      const fontFor = (run: AgreementRun) => run.bold ? (run.italic ? boldItalic : bold) : (run.italic ? italic : regular);
      let row: AgreementRun[] = [];
      let width = 0;
      const drawRow = () => {
        if (!row.length) return;
        const height = Math.max(...row.map(run => run.size)) * 1.45;
        requireSpace(height);
        let x = SIDE_MARGIN + (block.align === "center" ? (maxWidth - width) / 2 : block.align === "right" ? maxWidth - width : 0);
        for (const run of row) {
          const font = fontFor(run);
          const runWidth = font.widthOfTextAtSize(run.text, run.size);
          page.drawText(run.text, { x, y, size: run.size, font, color: rgb(.06, .18, .22) });
          if (run.underline) page.drawLine({ start: { x, y: y - 2 }, end: { x: x + runWidth, y: y - 2 }, thickness: .6, color: rgb(.06, .18, .22) });
          x += runWidth;
        }
        y -= height; row = []; width = 0;
      };
      for (const run of block.runs) {
        const font = fontFor(run);
        for (const token of printableText(run.text).split(/(\n|[^\S\n]+)/).filter(Boolean)) {
          if (token === "\n") {
            if (row.length) drawRow();
            else { requireSpace(run.size * 1.45); y -= run.size * 1.45; }
            continue;
          }
          const tokenWidth = font.widthOfTextAtSize(token, run.size);
          if (width + tokenWidth > maxWidth) drawRow();
          if (!width && /^\s+$/.test(token)) continue;
          // Split long unbroken words as well as ordinary word wrapping.
          for (const char of token) {
            const charWidth = font.widthOfTextAtSize(char, run.size);
            if (width + charWidth > maxWidth) drawRow();
            row.push({ ...run, text: char }); width += charWidth;
          }
        }
      }
      drawRow(); y -= 7;
      continue;
    }
    const isHeading = SECTION_HEADINGS.has(paragraph);
    const emphasizedPartyNames = partyNames
      .map((name) => printableText(name).trim())
      .filter((name) => name && paragraph.includes(name));
    if (emphasizedPartyNames.length) {
      const escapedNames = emphasizedPartyNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const parts = printableText(paragraph)
        .split(new RegExp(`(${escapedNames.join("|")})`, "g"))
        .filter(Boolean);
      const maxWidth = PAGE_WIDTH - SIDE_MARGIN * 2;
      const lines: Array<Array<{ text: string; isBold: boolean }>> = [[]];
      let lineWidth = 0;
      for (const part of parts) {
        const isBold = emphasizedPartyNames.includes(part);
        const partFont = isBold ? bold : regular;
        for (const token of part.split(/(\n|[^\S\n]+)/).filter(Boolean)) {
          if (token === "\n") { lines.push([]); lineWidth = 0; continue; }
          const tokenWidth = partFont.widthOfTextAtSize(token, BODY_SIZE);
          if (lineWidth + tokenWidth > maxWidth && lines[lines.length - 1].length) {
            lines.push([]);
            lineWidth = 0;
            if (/^\s+$/.test(token)) continue;
          }
          lines[lines.length - 1].push({ text: token, isBold });
          lineWidth += tokenWidth;
        }
      }
      requireSpace(lines.length * LINE_HEIGHT + 7);
      for (const line of lines) {
        let x = SIDE_MARGIN;
        for (const segment of line) {
          const segmentFont = segment.isBold ? bold : regular;
          page.drawText(segment.text, {
            x,
            y,
            size: BODY_SIZE,
            font: segmentFont,
            color: rgb(0.06, 0.18, 0.22),
          });
          x += segmentFont.widthOfTextAtSize(segment.text, BODY_SIZE);
        }
        y -= LINE_HEIGHT;
      }
      y -= 5;
      continue;
    }
    const font = isHeading ? bold : regular;
    const size = isHeading ? 12 : BODY_SIZE;
    const lines = wrapText(paragraph, PAGE_WIDTH - SIDE_MARGIN * 2, font, size);
    const blockHeight = lines.length * LINE_HEIGHT + (isHeading ? 8 : 7);
    requireSpace(blockHeight);
    for (const line of lines) {
      page.drawText(line, {
        x: SIDE_MARGIN,
        y,
        size,
        font,
        color: isHeading ? rgb(0.03, 0.42, 0.48) : rgb(0.06, 0.18, 0.22),
      });
      y -= LINE_HEIGHT;
    }
    y -= isHeading ? 6 : 5;
  }

  pdf.setTitle("Werkly Recruitment Agreement");
  pdf.setAuthor("Werkly Consulting");
  return pdf.save();
}

export function pdfBytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}
