"use client";

import dynamic from "next/dynamic";

export const ResumeBuilderClient = dynamic(
  () => import("@/components/resume-builder-v2").then((module) => module.ResumeBuilder),
  {
    ssr: false,
    loading: () => (
      <section className="hero-surface">
        <div className="section-shell py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Resume Builder</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              Build a polished resume with a layout that fits your profile.
            </h2>
            <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">
              Loading resume builder...
            </p>
          </div>
        </div>
      </section>
    ),
  }
);
