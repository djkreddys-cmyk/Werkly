"use client";

import { useRef, useState } from "react";
import type { JobSummary } from "@/lib/jobs";

export function JobFlyerButton({ job }: { job: JobSummary }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function open() {
    dialog.current?.showModal(); setBusy(true); setError(""); setPreview(""); canvas.current = null;
    try {
      const { renderJobFlyer } = await import("@/lib/job-flyer");
      canvas.current = await renderJobFlyer(job); setPreview(canvas.current.toDataURL("image/png"));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create flyer."); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!canvas.current) return;
    setBusy(true); setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.current!.toBlob(value => value ? resolve(value) : reject(new Error("Download failed.")), "image/png"));
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
      a.download = `Werkly-${(job.jobCode || job.slug).replace(/[^a-z0-9_-]/gi, "-")}-flyer.png`;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { setError("Unable to download. Please try again."); } finally { setBusy(false); }
  }
  return <>
    <button type="button" title="Create a branded job flyer" onClick={open} className="shrink-0 whitespace-nowrap rounded border border-[var(--color-dark)] px-3 py-2 text-xs font-semibold text-[var(--color-dark)]">Flyer</button>
    <dialog ref={dialog} aria-label={`Job flyer for ${job.title}`} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(94vw,650px)] overflow-auto rounded-xl bg-white p-5 backdrop:bg-black/60">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Job promotional flyer</h2><button type="button" onClick={() => dialog.current?.close()} className="rounded border px-3 py-2">Close</button></div>
      {busy && <p role="status">Preparing flyer…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
      <p className="mb-3 text-sm text-slate-600">Square social post · 1080 × 1080. Upload the PNG at its original ratio without zooming or cropping. Previously posted images will not update automatically.</p>
      {/* Canvas export is already a complete raster image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt={`Promotional flyer for ${job.title}`} className="mx-auto h-auto w-full max-w-[432px]" />}
      <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy || !preview} onClick={download} className="rounded bg-[#08606c] px-4 py-3 text-white disabled:opacity-40">Download PNG</button></div>
    </dialog>
  </>;
}
