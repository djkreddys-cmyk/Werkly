type LinkedInJobShareButtonProps = {
  title: string;
  slug: string;
  className?: string;
};

export function LinkedInJobShareButton({
  title,
  slug,
  className,
}: LinkedInJobShareButtonProps) {
  const jobUrl = `https://www.werkly.in/jobs/${encodeURIComponent(slug)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;

  return (
    <a
      href={linkedInShareUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share ${title} on LinkedIn`}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[#0a66c2] bg-white px-4 py-3 text-sm font-bold text-[#0a66c2] transition hover:bg-[#eef6ff]"
      }
    >
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-[2px] bg-[#0a66c2] text-[10px] font-bold leading-none text-white"
      >
        in
      </span>
      <span className="whitespace-nowrap">Share on LinkedIn</span>
    </a>
  );
}
