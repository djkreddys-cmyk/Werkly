"use client";

import { useState } from "react";

type JobShareButtonProps = {
  title: string;
  slug: string;
  jobCode?: string;
  sector?: string;
  location?: string;
  experience?: string;
  employmentType?: string;
  positionsCount?: number;
  lastDateToApply?: string;
  salary?: string;
  packagePerAnnum?: string;
  className?: string;
};

function formatDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
  return Promise.resolve();
}

export function JobShareButton({
  title,
  slug,
  jobCode,
  sector,
  location,
  experience,
  employmentType,
  positionsCount,
  lastDateToApply,
  salary,
  packagePerAnnum,
  className,
}: JobShareButtonProps) {
  const [label, setLabel] = useState("Share");

  async function handleShare() {
    const url = `https://www.werkly.in/jobs/${encodeURIComponent(slug)}`;
    const applyBy = formatDate(lastDateToApply);
    const detailLines = [
      `Position: ${title}`,
      jobCode ? `Job ID: ${jobCode}` : undefined,
      sector ? `Sector: ${sector}` : undefined,
      location ? `Location: ${location}` : undefined,
      experience ? `Experience: ${experience}` : undefined,
      employmentType ? `Employment Type: ${employmentType}` : undefined,
      positionsCount ? `Openings: ${positionsCount}` : undefined,
      applyBy ? `Apply By: ${applyBy}` : undefined,
      packagePerAnnum
        ? `Package: ${packagePerAnnum}`
        : salary
          ? `Salary: ${salary}`
          : undefined,
    ].filter((line): line is string => Boolean(line));
    const shareMessage = [
      "Werkly Job Opportunity",
      "",
      ...detailLines,
      "",
      "View full job details and apply:",
      url,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} | Werkly`,
          text: shareMessage,
        });
        return;
      }

      await copyText(shareMessage);
      setLabel("Details Copied");
      window.setTimeout(() => setLabel("Share"), 2500);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await copyText(shareMessage);
        setLabel("Details Copied");
        window.setTimeout(() => setLabel("Share"), 2500);
      } catch {
        setLabel("Try Again");
        window.setTimeout(() => setLabel("Share"), 2500);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${title} job`}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.07)]"
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
      </svg>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
