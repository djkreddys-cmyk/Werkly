import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const SIDE_MARGIN = 42;
const CONTENT_TOP = 704;
const CONTENT_BOTTOM = 72;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 15;

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
    .replaceAll("₹", "Rs. ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
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

export async function generateAgreementPdf(agreementContent: string) {
  const [letterheadBytes, footerBytes, signatureBytes] = await Promise.all([
    fetchBytes("/agreement-assets/letterhead.png"),
    fetchBytes("/agreement-assets/footer.png"),
    fetchBytes("/agreement-assets/signature.png"),
  ]);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
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

  const paragraphs = agreementContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    if (paragraph === "For Werkly Consulting Private Limited") {
      const clientSignatoryIndex = paragraphs.findIndex(
        (value, candidateIndex) => candidateIndex > index && value.startsWith("For ") && value !== paragraph
      );
      const clientSignatory = clientSignatoryIndex > index ? paragraphs[clientSignatoryIndex] : "For Client";
      requireSpace(104);
      page.drawText("For Werkly Consulting Private Limited", {
        x: SIDE_MARGIN,
        y,
        size: BODY_SIZE,
        font: bold,
        color: rgb(0.06, 0.18, 0.22),
      });
      page.drawText(printableText(clientSignatory), {
        x: PAGE_WIDTH / 2 + 22,
        y,
        size: BODY_SIZE,
        font: bold,
        color: rgb(0.06, 0.18, 0.22),
      });
      const signatureWidth = 118;
      const signatureHeight = (signature.height / signature.width) * signatureWidth;
      page.drawImage(signature, {
        x: SIDE_MARGIN,
        y: y - signatureHeight - 8,
        width: signatureWidth,
        height: signatureHeight,
      });
      page.drawText("Authorized Signatory", {
        x: SIDE_MARGIN,
        y: y - signatureHeight - 22,
        size: BODY_SIZE,
        font: regular,
        color: rgb(0.06, 0.18, 0.22),
      });
      page.drawText("Authorized Signatory", {
        x: PAGE_WIDTH / 2 + 22,
        y: y - signatureHeight - 22,
        size: BODY_SIZE,
        font: regular,
        color: rgb(0.06, 0.18, 0.22),
      });
      y -= signatureHeight + 42;
      if (clientSignatoryIndex > index) {
        index = clientSignatoryIndex;
        while (paragraphs[index + 1] === "Authorized Signatory") index += 1;
      } else {
        while (paragraphs[index + 1] === "Authorized Signatory") index += 1;
      }
      continue;
    }

    const isHeading = SECTION_HEADINGS.has(paragraph);
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
