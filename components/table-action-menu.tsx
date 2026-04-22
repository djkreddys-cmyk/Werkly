"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: 0,
    left: 0,
    opacity: 0,
  });

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current || !menuRef.current) {
        return;
      }

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const panelRect = menuRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 12;

      let left = buttonRect.left - panelRect.width - gap;
      if (left < viewportPadding) {
        left = Math.min(
          window.innerWidth - panelRect.width - viewportPadding,
          buttonRect.right + gap
        );
      }

      let top = openUp
        ? buttonRect.bottom - panelRect.height
        : buttonRect.top + buttonRect.height / 2 - panelRect.height / 2;

      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - panelRect.height - viewportPadding)
      );

      setMenuStyle({ top, left, opacity: 1 });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, openUp]);

  const menuPanel =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuStyle.top}px`,
              left: `${menuStyle.left}px`,
              opacity: menuStyle.opacity,
            }}
            className="z-[120] min-w-[210px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-dark)] transition hover:border-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.06)]"
      >
        <MoreVerticalIcon />
      </button>

      {menuPanel}
    </div>
  );
}
