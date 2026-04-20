"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type ActionTone = "default" | "accent" | "danger";

export type TableActionMenuItem = {
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  tone?: ActionTone;
};

function MoreVerticalIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="15.5" r="1.5" />
    </svg>
  );
}

function getToneClassName(tone: ActionTone = "default") {
  if (tone === "danger") {
    return "text-[var(--color-accent-strong)] hover:bg-[rgba(190,72,26,0.06)]";
  }
  if (tone === "accent") {
    return "text-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.06)]";
  }
  return "text-[var(--color-ink)] hover:bg-[rgba(8,96,108,0.06)]";
}

export function TableActionMenu({
  label,
  isOpen,
  onToggle,
  onClose,
  items,
  openUp = false,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: TableActionMenuItem[];
  openUp?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onClose]);

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-dark)] transition hover:border-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.06)]"
      >
        <MoreVerticalIcon />
      </button>

      {isOpen ? (
        <div
          className={`absolute right-[calc(100%+0.75rem)] z-30 min-w-[210px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)] ${
            openUp ? "bottom-0" : "top-1/2 -translate-y-1/2"
          }`}
        >
          {items.map((item) => {
            const className = `flex w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${getToneClassName(item.tone)}`;

            if (item.href) {
              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={onClose}
                    className={className}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link key={item.label} href={item.href} onClick={onClose} className={className}>
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onClose();
                  item.onClick?.();
                }}
                className={className}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
