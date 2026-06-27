"use client";

import { useEffect, useMemo, useState } from "react";

type TabKey = "home" | "jobs" | "resume" | "track" | "profile";

type Job = {
  id?: string;
  slug?: string;
  title?: string;
  sector?: string;
  location?: string;
  packagePerAnnum?: string;
  salary?: string;
  experience?: string;
  employmentType?: string;
  summary?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  lastDateToApply?: string;
};

const profile = {
  name: "Jaswanth Reddy",
  email: "djkreddys@gmail.com",
  phone: "9876543210",
  role: "ERP Manager",
  location: "Hyderabad",
  expectedCtc: "15 LPA",
  notice: "30 days",
  education: "MBA / Operations",
  experience: "8+ years",
  resume: "Jaswanth_Reddy_Resume.pdf",
  skills: ["ERP", "Reporting", "Stakeholder Management", "Delivery Planning"],
};

const fallbackJobs: Job[] = [
  {
    id: "regional-sales-manager",
    title: "Regional Sales Manager",
    sector: "Building Materials / Non-IT",
    location: "Hyderabad / AP",
    packagePerAnnum: "10 - 14 LPA",
    experience: "6+ years",
    employmentType: "Full Time",
    summary: "Own regional sales growth, dealer relationships, and client follow-ups.",
    responsibilities: ["Manage regional pipeline", "Build dealer network", "Report sales progress"],
    requirements: ["6+ years sales experience", "Strong AP/Telangana market knowledge"],
    lastDateToApply: "Apply soon",
  },
  {
    id: "erp-manager",
    title: "ERP Manager",
    sector: "Education Technology / IT",
    location: "Hyderabad",
    packagePerAnnum: "12 - 18 LPA",
    experience: "8+ years",
    employmentType: "Full Time",
    summary: "Lead ERP adoption, reporting, and process discipline.",
    responsibilities: ["Own ERP delivery", "Coordinate stakeholders", "Improve reporting"],
    requirements: ["8+ years ERP experience", "Process and reporting discipline"],
    lastDateToApply: "Apply soon",
  },
];

const baseFilters = ["All", "IT", "Non-IT", "Hyderabad", "Vijayawada", "8+ yrs", "10 LPA+", "Full Time"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CandidateMobilePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<TabKey>("home");
  const [filters, setFilters] = useState(baseFilters);
  const [activeFilters, setActiveFilters] = useState<string[]>(["All"]);
  const [jobs, setJobs] = useState<Job[]>(fallbackJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [resumeMode, setResumeMode] = useState<"profile" | "draft">("profile");
  const [resumeSection, setResumeSection] = useState<string | null>(null);
  const [profileToast, setProfileToast] = useState("");

  useEffect(() => {
    fetch("/api/jobs", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const liveJobs = Array.isArray(data?.jobs) ? data.jobs : [];
        if (liveJobs.length) setJobs(liveJobs);
      })
      .catch(() => undefined);
  }, []);

  const visibleJobs = useMemo(() => {
    if (activeFilters.includes("All")) return jobs;
    return jobs.filter((job) => {
      const haystack = [
        job.title,
        job.sector,
        job.location,
        job.packagePerAnnum,
        job.salary,
        job.experience,
        job.employmentType,
      ]
        .join(" ")
        .toLowerCase();
      return activeFilters.every((filter) => {
        const normalized = filter.toLowerCase().replace("+", "").trim();
        if (filter === "8+ yrs") return haystack.includes("8") || haystack.includes("years");
        if (filter === "10 LPA+") return haystack.includes("10") || haystack.includes("lpa");
        return haystack.includes(normalized);
      });
    });
  }, [activeFilters, jobs]);

  function toggleFilter(filter: string) {
    if (filter === "All") {
      setActiveFilters(["All"]);
      return;
    }
    setActiveFilters((current) => {
      const next = current.filter((item) => item !== "All");
      if (next.includes(filter)) {
        const removed = next.filter((item) => item !== filter);
        return removed.length ? removed : ["All"];
      }
      return [...next, filter];
    });
  }

  function removeFilter(filter: string) {
    setFilters((current) => current.filter((item) => item !== filter));
    setActiveFilters((current) => {
      const next = current.filter((item) => item !== filter);
      return next.length ? next : ["All"];
    });
  }

  function addFilter() {
    const value = window.prompt("Add role, location, salary, sector, IT/Non-IT")?.trim();
    if (!value) return;
    setFilters((current) => (current.includes(value) ? current : [...current, value]));
    setActiveFilters((current) => [...current.filter((item) => item !== "All"), value]);
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#f8f4ee] px-4 py-8 text-[#17353d]">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center">
          <div className="mb-5 flex justify-center">
            <img src="/Werkly Logo.png" alt="Werkly" className="h-24 w-24 object-contain" />
          </div>
          <div className="rounded-lg border border-[rgba(8,96,108,0.14)] bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[#08606c]">Login details</p>
            <label className="mb-3 block text-sm">
              Username
              <input className="mt-1 w-full border-b border-[#6c7a80] bg-transparent px-1 py-2 outline-none" defaultValue={profile.email} />
            </label>
            <label className="mb-5 block text-sm">
              Password
              <input className="mt-1 w-full border-b border-[#6c7a80] bg-transparent px-1 py-2 outline-none" type="password" defaultValue="password123" />
            </label>
            <button onClick={() => setLoggedIn(true)} className="w-full rounded-full bg-[#08606c] px-4 py-3 text-sm text-white">
              Login
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eaf0f4] px-2 py-3 text-[#17353d]">
      <section className="mx-auto min-h-[800px] max-w-[430px] overflow-hidden rounded-lg border border-[rgba(8,96,108,0.18)] bg-[#f8f4ee] shadow-sm">
        <div className="h-[calc(100vh-86px)] min-h-[720px] overflow-y-auto px-4 pb-24 pt-5">
          {tab === "home" && <Home />}
          {tab === "jobs" && (
            <Jobs
              filters={filters}
              activeFilters={activeFilters}
              jobs={visibleJobs}
              total={jobs.length}
              onToggle={toggleFilter}
              onRemove={removeFilter}
              onAdd={addFilter}
              onDetails={setSelectedJob}
              onApply={setApplyingJob}
            />
          )}
          {tab === "resume" && (
            <Resume
              mode={resumeMode}
              section={resumeSection}
              onMode={setResumeMode}
              onSection={setResumeSection}
            />
          )}
          {tab === "track" && <Applications />}
          {tab === "profile" && <Profile onAction={setProfileToast} />}
        </div>
        <nav className="fixed bottom-0 left-1/2 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-[rgba(8,96,108,0.14)] bg-[#e7eff1] px-2 py-2">
          {(["home", "jobs", "resume", "track", "profile"] as TabKey[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-full px-1 py-2 text-xs capitalize ${tab === item ? "bg-[#c9eef2] text-[#08606c]" : "text-[#44565c]"}`}
            >
              {item}
            </button>
          ))}
        </nav>
      </section>
      {selectedJob ? <JobDetails job={selectedJob} onClose={() => setSelectedJob(null)} onApply={setApplyingJob} /> : null}
      {applyingJob ? <ApplyConfirmation job={applyingJob} onClose={() => setApplyingJob(null)} /> : null}
      {profileToast ? (
        <button onClick={() => setProfileToast("")} className="fixed bottom-20 left-1/2 max-w-xs -translate-x-1/2 rounded-full bg-[#17353d] px-4 py-2 text-sm text-white">
          {profileToast} editor opened
        </button>
      ) : null}
    </main>
  );
}

function Card({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={`mb-3 rounded-lg border p-4 shadow-sm ${dark ? "border-[#08606c] bg-[#08606c] text-white" : "border-[rgba(8,96,108,0.14)] bg-white"}`}>
      {children}
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#edf4f2] px-3 py-2 text-xs text-[#08606c]">{children}</span>;
}

function Home() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[#08606c]">Werkly candidate</p>
      <h1 className="mt-1 text-2xl font-normal">{greeting()}, Jaswanth</h1>
      <Card>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#08606c]">Candidate onboarding</p>
        <div className="flex flex-wrap gap-2">
          {["Personal info done", "Experience", "Skills", "Preferred role done", "Expected CTC done", "Notice period done", "Location done"].map((item) => (
            <Pill key={item}>{item}</Pill>
          ))}
        </div>
      </Card>
      <Card dark>
        <p className="text-xs uppercase tracking-[0.2em] text-[#f1a64b]">Profile strength</p>
        <div className="mt-4 flex items-end justify-between">
          <strong className="text-4xl font-normal">70%</strong>
          <button className="rounded-full bg-[#f1a64b] px-5 py-2 text-sm text-[#17353d]">Complete</button>
        </div>
        <p className="mt-3 text-sm text-white/75">Add resume and education to improve matches.</p>
        <div className="mt-4 h-2 rounded-full bg-white/25"><div className="h-2 w-[70%] rounded-full bg-[#f1a64b]" /></div>
      </Card>
      <Card>
        <div className="mb-3 flex justify-between"><h2 className="text-lg font-normal">Profile checklist</h2><span className="text-sm text-[#08606c]">3/5 done</span></div>
        {["Resume pending", "Education pending", "Skills added", "Expected CTC added", "Preferred location added"].map((item) => (
          <p key={item} className="border-b border-[rgba(8,96,108,0.08)] py-2 text-sm">{item}</p>
        ))}
      </Card>
    </>
  );
}

function Jobs(props: {
  filters: string[];
  activeFilters: string[];
  jobs: Job[];
  total: number;
  onToggle: (filter: string) => void;
  onRemove: (filter: string) => void;
  onAdd: () => void;
  onDetails: (job: Job) => void;
  onApply: (job: Job) => void;
}) {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[#08606c]">Job search</p>
      <h1 className="mt-1 text-2xl font-normal">Find roles that match your profile</h1>
      <input className="my-4 w-full rounded-lg border border-[#17353d] bg-[#e9eef0] px-4 py-3 outline-none" placeholder="Search role, skill, location" />
      <div className="mb-3 flex flex-wrap gap-2">
        {props.filters.map((filter) => (
          <button key={filter} className={`rounded-lg border px-3 py-2 text-sm ${props.activeFilters.includes(filter) ? "border-[#cceef3] bg-[#cceef3] text-[#08606c]" : "border-[#c8d2d5] bg-white"}`} onClick={() => props.onToggle(filter)}>
            {props.activeFilters.includes(filter) ? "✓ " : ""}{filter}
            {filter !== "All" ? <span onClick={(event) => { event.stopPropagation(); props.onRemove(filter); }} className="ml-2 text-[#be481a]">×</span> : null}
          </button>
        ))}
        <button onClick={props.onAdd} className="rounded-lg border border-[#c8d2d5] bg-white px-3 py-2 text-sm text-[#08606c]">+ Add filter</button>
      </div>
      <Card>
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#08606c]">Filters</p>
        <div className="flex flex-wrap gap-2">{props.activeFilters.map((item) => <Pill key={item}>{item === "All" ? "All live jobs" : item}</Pill>)}</div>
      </Card>
      <div className="mb-3 flex justify-between"><h2 className="text-lg font-normal">Live jobs</h2><span className="text-sm text-[#08606c]">{props.jobs.length}/{props.total}</span></div>
      {props.jobs.map((job) => (
        <Card key={job.id ?? job.slug ?? job.title}>
          <h3 className="text-lg font-normal">{job.title ?? "Werkly job"}</h3>
          <p className="mt-1 text-sm text-[#6c7a80]">{job.sector ?? "Werkly verified role"}</p>
          <div className="my-3 flex flex-wrap gap-2">
            <Pill>{job.location ?? "Location flexible"}</Pill>
            <Pill>{job.packagePerAnnum ?? job.salary ?? "As per role"}</Pill>
            <Pill>{job.experience ?? "Relevant experience"}</Pill>
            <Pill>{job.employmentType ?? "Full Time"}</Pill>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => props.onDetails(job)} className="rounded-lg border px-2 py-2 text-sm">Details</button>
            <button onClick={() => props.onApply(job)} className="rounded-lg bg-[#08606c] px-2 py-2 text-sm text-white">Apply</button>
            <button className="rounded-lg border px-2 py-2 text-sm">Share</button>
          </div>
        </Card>
      ))}
    </>
  );
}

function Resume({ mode, section, onMode, onSection }: { mode: "profile" | "draft"; section: string | null; onMode: (mode: "profile" | "draft") => void; onSection: (section: string | null) => void }) {
  if (section) return <ResumeForm section={section} onBack={() => onSection(null)} />;
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[#08606c]">Resume builder</p>
      <h1 className="mt-1 text-2xl font-normal">Build once, apply faster</h1>
      <Card>
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#08606c]">Resume mode</p>
        <label className="flex gap-3 py-2"><input type="checkbox" checked={mode === "profile"} onChange={() => onMode("profile")} />Use my profile details</label>
        <label className="flex gap-3 py-2"><input type="checkbox" checked={mode === "draft"} onChange={() => onMode("draft")} />Talent Draft</label>
      </Card>
      {["Personal Information", "Skills & Achievements", "Experience", "Education"].map((item) => (
        <button key={item} onClick={() => onSection(item)} className="mb-3 flex w-full items-center justify-between rounded-lg border border-[rgba(8,96,108,0.14)] bg-white p-4 text-left">
          <span>{item}</span><span className="text-[#08606c]">Fill</span>
        </button>
      ))}
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-[#08606c]">Resume preview</p>
        <h2 className="mt-3 text-lg font-normal">{mode === "profile" ? profile.name : "Talent Draft"}</h2>
        <p className="text-sm text-[#6c7a80]">{mode === "profile" ? `${profile.role} / ${profile.location}` : "Role / Location to be added"}</p>
        <p className="mt-3 text-sm">{mode === "profile" ? profile.skills.join(", ") : "Add skills for this Talent Draft"}</p>
      </Card>
    </>
  );
}

function ResumeForm({ section, onBack }: { section: string; onBack: () => void }) {
  const isExperience = section === "Experience";
  const isEducation = section === "Education";
  const [blocks, setBlocks] = useState(1);
  const fields = section === "Personal Information"
    ? ["Full Name", "Email", "Phone", "Alternative Number", "Location", "LinkedIn", "Portfolio", "Address", "Date of Birth", "Nationality", "Gender", "Mother Tongue", "Other Languages", "Years of Experience", "Certifications"]
    : section === "Skills & Achievements"
      ? ["Core Skills", "Career Notes / Achievements"]
      : isExperience
        ? ["Company", "Title", "Location", "Joined Month", "Joined Year", "Exit Month", "Exit Year / Present", "Responsibilities and achievements"]
        : ["Institution", "Degree", "Year"];
  return (
    <>
      <button onClick={onBack} className="mb-3 text-sm text-[#08606c]">Back</button>
      <Card dark>
        <p className="text-xs uppercase tracking-[0.2em] text-[#f1a64b]">Mobile resume builder</p>
        <h1 className="mt-2 text-2xl font-normal">{section}</h1>
        <p className="mt-2 text-sm text-white/75">Tap each field, save draft, and continue section by section.</p>
      </Card>
      <Card>
        {Array.from({ length: blocks }).map((_, blockIndex) => (
          <div key={blockIndex} className={blockIndex ? "mt-4 border-t border-[rgba(8,96,108,0.14)] pt-4" : ""}>
            {blocks > 1 ? <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#08606c]">{section} {blockIndex + 1}</p> : null}
            {fields.map((field) => (
              <label key={`${blockIndex}-${field}`} className="mb-3 block text-sm">
                {field}
                <input className="mt-1 w-full rounded-lg border border-[rgba(8,96,108,0.18)] bg-white px-3 py-3 outline-none" defaultValue={field === "Full Name" ? profile.name : field === "Email" ? profile.email : ""} />
              </label>
            ))}
          </div>
        ))}
        {(isExperience || isEducation) ? (
          <button onClick={() => setBlocks((value) => value + 1)} className="mt-2 w-full rounded-lg border border-[#08606c] px-4 py-3 text-[#08606c]">
            {isExperience ? "Add experience" : "Add qualification"}
          </button>
        ) : null}
      </Card>
      <button onClick={onBack} className="w-full rounded-full bg-[#08606c] px-4 py-3 text-white">Save</button>
    </>
  );
}

function Applications() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[#08606c]">Applications</p>
      <h1 className="mt-1 text-2xl font-normal">Track every job clearly</h1>
      <Card>{["Applied", "Shortlisted", "Interview", "Offered", "Joined"].map((item) => <p key={item} className="py-2">{item}</p>)}</Card>
    </>
  );
}

function Profile({ onAction }: { onAction: (title: string) => void }) {
  const cards = [
    ["Personal details", `${profile.name}, ${profile.email}, ${profile.phone}`],
    ["Education", profile.education],
    ["Experience", `${profile.experience}, ${profile.role}`],
    ["Preferences", `${profile.expectedCtc}, ${profile.notice}, ${profile.location}`],
    ["Skills", profile.skills.join(", ")],
    ["Document center", profile.resume],
    ["Document upload flow", "Resume, certificates, ID proof, offer letter"],
    ["Offline drafts", "Profile and resume edits save locally"],
    ["Share options", "WhatsApp resume, email resume, share job"],
    ["Mobile settings", "Dark mode, language support"],
    ["Candidate analytics", "Profile views, applications, shortlist rate"],
  ];
  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[#08606c]">Smart profile</p>
      <h1 className="mt-1 text-2xl font-normal">Your candidate profile</h1>
      {cards.map(([title, detail]) => (
        <button key={title} onClick={() => onAction(title)} className="mb-3 w-full rounded-lg border border-[rgba(8,96,108,0.14)] bg-white p-4 text-left shadow-sm">
          <div className="flex justify-between gap-3"><span>{title}</span><span className="text-[#08606c]">›</span></div>
          <p className="mt-2 text-sm text-[#6c7a80]">{detail}</p>
        </button>
      ))}
    </>
  );
}

function JobDetails({ job, onClose, onApply }: { job: Job; onClose: () => void; onApply: (job: Job) => void }) {
  return (
    <div className="fixed inset-0 z-20 bg-black/50 px-5 py-8">
      <section className="mx-auto flex max-h-full max-w-[390px] flex-col rounded-3xl bg-[#f8f4ee]">
        <div className="overflow-y-auto p-6">
          <button onClick={onClose} className="mb-4 text-sm text-[#08606c]">Back</button>
          <h2 className="text-2xl font-normal">{job.title}</h2>
          <p className="mt-2 text-[#6c7a80]">{job.sector} / {job.location}</p>
          <div className="my-4 flex flex-wrap gap-2"><Pill>{job.packagePerAnnum ?? job.salary}</Pill><Pill>{job.experience}</Pill><Pill>{job.employmentType ?? "Full Time"}</Pill></div>
          <p className="text-sm leading-6">{job.summary || job.description || "Full job details will appear here."}</p>
          {[...(job.responsibilities ?? []), ...(job.requirements ?? [])].map((item) => <p key={item} className="mt-3 text-sm">✓ {item}</p>)}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[rgba(8,96,108,0.14)] p-4">
          <button className="rounded-lg border px-4 py-3">Share</button>
          <button onClick={() => onApply(job)} className="rounded-lg bg-[#08606c] px-4 py-3 text-white">Apply</button>
        </div>
      </section>
    </div>
  );
}

function ApplyConfirmation({ job, onClose }: { job: Job; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 bg-black/50 px-5 py-8">
      <section className="mx-auto max-h-full max-w-[390px] overflow-y-auto rounded-3xl bg-[#f8f4ee] p-5">
        <button onClick={onClose} className="mb-4 text-sm text-[#08606c]">Back</button>
        <Card dark><p className="text-xs uppercase tracking-[0.2em] text-[#f1a64b]">One-tap apply</p><h2 className="mt-2 text-2xl font-normal">{job.title}</h2><p className="mt-2 text-white/70">{profile.name}</p></Card>
        <Card>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#08606c]">Resume selected</p>
          <input className="mb-3 w-full rounded-lg border px-3 py-3" defaultValue={profile.resume} />
          <div className="rounded-lg border bg-[#f8f4ee] p-3"><strong className="font-normal">{profile.name}</strong><p className="text-sm text-[#6c7a80]">{profile.role} / {profile.skills.join(", ")}</p></div>
        </Card>
        <Card>
          <input className="mb-3 w-full rounded-lg border px-3 py-3" defaultValue={profile.expectedCtc} />
          <input className="mb-3 w-full rounded-lg border px-3 py-3" defaultValue={profile.notice} />
          <textarea className="w-full rounded-lg border px-3 py-3" placeholder="Note to recruiter" />
        </Card>
        <button onClick={onClose} className="w-full rounded-full bg-[#08606c] px-4 py-3 text-white">Confirm apply</button>
      </section>
    </div>
  );
}
