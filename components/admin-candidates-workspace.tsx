"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

type CandidateWorkspaceView = "applicants" | "resume-builders" | "enquiries";

type CandidateWorkspaceOption = {
  value: CandidateWorkspaceView;
  label: string;
  description: string;
};

const candidateWorkspaceOptions: CandidateWorkspaceOption[] = [
  {
    value: "applicants",
    label: "Job Applicants",
    description: "Candidates applied or added against jobs",
  },
  {
    value: "resume-builders",
    label: "Resume Builders",
    description: "Candidates who generated resumes",
  },
  {
    value: "enquiries",
    label: "Candidate Enquiries",
    description: "Website and manually added enquiries",
  },
];

function LoadingPanel({ label }: { label: string }) {
  return (
    <section className="accent-card p-6">
      <p className="muted-copy text-sm">{label}</p>
    </section>
  );
}

const JobApplicantsPanel = dynamic(
  () =>
    import("@/components/admin-candidates-panel").then(
      (module) => module.AdminCandidatesPanel
    ),
  {
    ssr: false,
    loading: () => <LoadingPanel label="Loading job applicants..." />,
  }
);

const ResumeBuildersPanel = dynamic(
  () =>
    import("@/components/admin-resume-builders-panel").then(
      (module) => module.AdminResumeBuildersPanel
    ),
  {
    ssr: false,
    loading: () => <LoadingPanel label="Loading resume builders..." />,
  }
);

const CandidateEnquiriesPanel = dynamic(
  () =>
    import("@/components/admin-candidate-enquiries-panel").then(
      (module) => module.AdminCandidateEnquiriesPanel
    ),
  {
    ssr: false,
    loading: () => <LoadingPanel label="Loading candidate enquiries..." />,
  }
);

function getViewFromQuery() {
  if (typeof window === "undefined") {
    return null;
  }

  const type = new URLSearchParams(window.location.search).get("type");
  return candidateWorkspaceOptions.some((option) => option.value === type)
    ? (type as CandidateWorkspaceView)
    : null;
}

export function AdminCandidatesWorkspace({
  initialView = "applicants",
}: {
  initialView?: CandidateWorkspaceView;
}) {
  const [view, setView] = useState<CandidateWorkspaceView>(() => {
    const queryView = getViewFromQuery();
    if (queryView) {
      return queryView;
    }

    if (typeof window === "undefined") {
      return initialView;
    }

    if (initialView !== "applicants") {
      return initialView;
    }

    const savedView = window.localStorage.getItem("werklyCandidateWorkspaceView");
    return candidateWorkspaceOptions.some((option) => option.value === savedView)
      ? (savedView as CandidateWorkspaceView)
      : initialView;
  });

  const selectedOption = useMemo(
    () => candidateWorkspaceOptions.find((option) => option.value === view),
    [view]
  );

  useEffect(() => {
    window.localStorage.setItem("werklyCandidateWorkspaceView", view);
  }, [view]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Candidate Type</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
            {selectedOption?.description}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] sm:min-w-[260px]">
          Type
          <select
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            value={view}
            onChange={(event) => setView(event.target.value as CandidateWorkspaceView)}
          >
            {candidateWorkspaceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === "resume-builders" ? (
        <ResumeBuildersPanel />
      ) : view === "enquiries" ? (
        <CandidateEnquiriesPanel />
      ) : (
        <JobApplicantsPanel />
      )}
    </div>
  );
}
