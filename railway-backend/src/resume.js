import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const PDF_MIME_TYPE = "application/pdf";
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function sanitizeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function buildResumePdfName(candidateName, currentDesignation) {
  const name = sanitizeFilePart(candidateName) || "Candidate";
  const designation = sanitizeFilePart(currentDesignation);
  return `${designation ? `${name}_${designation}` : name}.pdf`;
}

function parseDataUrl(dataUrl, fallbackMimeType) {
  const value = String(dataUrl || "").trim();
  const match = value.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$/s);

  if (match) {
    return {
      mimeType: match[1] || fallbackMimeType || "application/octet-stream",
      buffer: Buffer.from(match[2] || "", "base64"),
    };
  }

  return {
    mimeType: fallbackMimeType || "application/octet-stream",
    buffer: Buffer.from(value, "base64"),
  };
}

function inferExtension(fileName, mimeType) {
  const extension = path.extname(String(fileName || "")).toLowerCase();
  if (extension) {
    return extension;
  }

  if (mimeType === PDF_MIME_TYPE) {
    return ".pdf";
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return ".docx";
  }
  if (mimeType === "application/msword" || mimeType === "text/html") {
    return ".doc";
  }

  return "";
}

async function convertWordToPdf(inputPath, outputDir) {
  await execFileAsync("soffice", [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outputDir,
    inputPath,
  ]);

  const convertedPath = path.join(outputDir, `${path.parse(inputPath).name}.pdf`);
  return readFile(convertedPath);
}

async function compressPdf(pdfBuffer, workingDir) {
  const inputPath = path.join(workingDir, "resume-input.pdf");
  const outputPath = path.join(workingDir, "resume-output.pdf");
  await writeFile(inputPath, pdfBuffer);

  try {
    await execFileAsync("gs", [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);

    const compressed = await readFile(outputPath);
    return compressed.length > 0 && compressed.length < pdfBuffer.length ? compressed : pdfBuffer;
  } catch {
    return pdfBuffer;
  }
}

export async function processResumeUpload({
  candidateName,
  currentDesignation,
  resumeFileName,
  resumeFileType,
  resumeFileData,
}) {
  if (!String(resumeFileData || "").trim()) {
    return {
      resumeFileName: String(resumeFileName || "").trim() || undefined,
      resumeFileType: String(resumeFileType || "").trim() || undefined,
      resumeFileData: String(resumeFileData || "").trim() || undefined,
    };
  }

  const parsed = parseDataUrl(resumeFileData, resumeFileType);
  if (!parsed.buffer.length) {
    throw new Error("Uploaded resume file is empty.");
  }
  if (parsed.buffer.length > MAX_RESUME_BYTES) {
    throw new Error("Resume file must be 5 MB or smaller before conversion.");
  }

  const extension = inferExtension(resumeFileName, parsed.mimeType);
  const workingDir = await mkdtemp(path.join(os.tmpdir(), "werkly-resume-"));

  try {
    let pdfBuffer;

    if (extension === ".pdf" || parsed.mimeType === PDF_MIME_TYPE) {
      pdfBuffer = parsed.buffer;
    } else if ([".doc", ".docx", ".rtf", ".odt"].includes(extension)) {
      const inputPath = path.join(workingDir, `resume-source${extension}`);
      await writeFile(inputPath, parsed.buffer);
      pdfBuffer = await convertWordToPdf(inputPath, workingDir);
    } else {
      throw new Error("Resume upload must be a PDF, DOC, or DOCX file.");
    }

    const compressedPdf = await compressPdf(pdfBuffer, workingDir);
    const outputName = buildResumePdfName(candidateName, currentDesignation);

    return {
      resumeFileName: outputName,
      resumeFileType: PDF_MIME_TYPE,
      resumeFileData: `data:${PDF_MIME_TYPE};base64,${compressedPdf.toString("base64")}`,
    };
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}
