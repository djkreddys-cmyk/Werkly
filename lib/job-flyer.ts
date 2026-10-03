import type { JobSummary } from "./jobs";

export async function renderJobFlyer(job: JobSummary): Promise<HTMLCanvasElement> {
  const QRCode = (await import("qrcode")).default;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot create a flyer.");
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Unable to load flyer artwork.")); image.src = src;
  });
  const url = `https://www.werkly.in/jobs/${encodeURIComponent(job.slug)}`;
  const [logo, qr] = await Promise.all([load("/werkly-logo-compact.webp"), load(await QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: "M" }))]);
  ctx.fillStyle = "#0b2832"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#f1b965"; ctx.fillRect(0, 0, 1080, 14);
  ctx.drawImage(logo, 70, 62, 320, 91);
  const text = (value: string, x: number, y: number, size: number, color = "#ffffff", bold = false) => {
    ctx.font = `${bold ? "700" : "400"} ${size}px Arial`; ctx.fillStyle = color; ctx.fillText(value, x, y);
  };
  const lines = (value: string, x: number, y: number, width: number, size: number, limit: number, color = "#ffffff") => {
    ctx.font = `700 ${size}px Arial`;
    const words = value.replace(/\s+/g, " ").trim().split(" "); const rows: string[] = []; let row = "";
    for (const word of words) {
      if (ctx.measureText(`${row} ${word}`.trim()).width > width && row) { rows.push(row); row = ""; }
      for (const char of word) { if (ctx.measureText(row + char).width > width) { rows.push(row); row = ""; } row += char; }
      row += " ";
    }
    if (row.trim()) rows.push(row.trim());
    rows.slice(0, limit).forEach((line, i) => {
      if (i === limit - 1 && rows.length > limit) { while (ctx.measureText(line + "…").width > width) line = line.slice(0, -1); line += "…"; }
      text(line, x, y + i * size * 1.25, size, color, true);
    });
  };
  text("WE ARE HIRING", 70, 235, 28, "#f1b965", true);
  lines(job.title, 70, 325, 930, 64, 3);
  text(`JOB ID  ${job.jobCode || job.id}`, 70, 550, 23, "#bdcdd0");
  const fields = [["LOCATION", job.location], ["EXPERIENCE", job.experience], ["EMPLOYMENT", job.employmentType], ["SALARY", job.packagePerAnnum || job.salary || "Not disclosed"]];
  fields.forEach(([label, value], index) => {
    const x = 70 + (index % 2) * 490; const y = 625 + Math.floor(index / 2) * 130;
    text(label, x, y, 20, "#f1b965", true); lines(value || "Not specified", x, y + 42, 435, 29, 2);
  });
  const skills = (job.skills || []).filter(Boolean).slice(0, 5).join(" · ");
  if (skills) lines(skills, 70, 900, 930, 25, 2, "#bdcdd0");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 990, 1080, 360);
  ctx.drawImage(qr, 770, 1030, 240, 240);
  text("YOUR NEXT MOVE STARTS HERE", 70, 1060, 23, "#08606c", true);
  text("Apply now", 70, 1130, 54, "#0b2832", true);
  text("Scan the QR code for details & application", 70, 1180, 25, "#0b2832");
  text("www.werkly.in/jobs", 70, 1230, 28, "#08606c", true);
  if (job.lastDateToApply && !Number.isNaN(Date.parse(job.lastDateToApply))) text(`Apply by ${new Date(job.lastDateToApply).toLocaleDateString("en-IN")}`, 70, 1275, 22, "#0b2832");
  text("Werkly does not charge candidates for job offers.", 70, 1320, 19, "#48616a");
  return canvas;
}
