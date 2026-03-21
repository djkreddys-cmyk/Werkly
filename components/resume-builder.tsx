"use client";

import { useState, useTransition } from "react";

type ExperienceInput = { id: string; company: string; title: string; location: string; start: string; end: string; highlights: string };
type EducationInput = { id: string; institution: string; degree: string; year: string };
type TemplateStyle = "executive" | "sidebar" | "modern";

type ResumeData = {
  fullName: string;
  targetRole: string;
  contactLine: string;
  headline: string;
  summary: string;
  coreSkills: string[];
  strengths: string[];
  experience: Array<{ company: string; title: string; location: string; period: string; bullets: string[] }>;
  education: Array<{ institution: string; degree: string; year: string; details?: string }>;
  certifications: string[];
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  targetRole: string;
  yearsExperience: string;
  professionalNotes: string;
  skills: string;
  certifications: string;
  experiences: ExperienceInput[];
  education: EducationInput[];
};

const templateCards = [
  { key: "executive" as const, title: "Executive", description: "Classic single-column corporate layout." },
  { key: "sidebar" as const, title: "Sidebar", description: "Profile-first layout with a strong left rail." },
  { key: "modern" as const, title: "Modern", description: "Card-based resume with stronger visual grouping." },
];

const createExperience = (): ExperienceInput => ({ id: crypto.randomUUID(), company: "", title: "", location: "", start: "", end: "", highlights: "" });
const createEducation = (): EducationInput => ({ id: crypto.randomUUID(), institution: "", degree: "", year: "" });
const initialForm = (): FormState => ({ fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", targetRole: "", yearsExperience: "", professionalNotes: "", skills: "", certifications: "", experiences: [createExperience()], education: [createEducation()] });

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildWordMarkup(resume: ResumeData) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(resume.fullName)} Resume</title><style>body{font-family:Arial,sans-serif;color:#17353d;margin:32px;line-height:1.5}h1{font-size:28px;margin:0 0 6px}h2{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#08606c;margin:24px 0 8px}p{margin:0 0 10px}ul{margin:8px 0 0 18px}.meta{color:#5b6b72;margin-bottom:12px}</style></head><body><h1>${escapeHtml(resume.fullName)}</h1><p><strong>${escapeHtml(resume.targetRole)}</strong></p><p class="meta">${escapeHtml(resume.contactLine)}</p><h2>Professional Summary</h2><p>${escapeHtml(resume.summary)}</p><h2>Core Skills</h2><p>${escapeHtml(resume.coreSkills.join(", "))}</p><h2>Professional Experience</h2>${resume.experience.map((item) => `<p><strong>${escapeHtml(item.title)}</strong> | ${escapeHtml(item.company)}</p><p class="meta">${escapeHtml([item.location, item.period].filter(Boolean).join(" | "))}</p><ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`).join("")}<h2>Education</h2>${resume.education.map((item) => `<p><strong>${escapeHtml(item.degree || item.institution)}</strong></p><p class="meta">${escapeHtml([item.institution, item.year].filter(Boolean).join(" | "))}</p>`).join("")}${resume.certifications.length ? `<h2>Certifications</h2><p>${escapeHtml(resume.certifications.join(", "))}</p>` : ""}</body></html>`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">{children}</p>;
}

function ResumePreview({ resume, template }: { resume: ResumeData; template: TemplateStyle }) {
  const wrapper = template === "sidebar"
    ? "print-preview overflow-hidden rounded-[1.8rem] bg-white shadow-[0_18px_50px_rgba(15,47,54,0.1)]"
    : "print-preview rounded-[1.8rem] bg-white p-8 shadow-[0_18px_50px_rgba(15,47,54,0.1)]";

  if (template === "sidebar") {
    return (
      <article className={wrapper}>
        <div className="grid md:grid-cols-[0.72fr_1.28fr]">
          <aside className="bg-[rgba(8,96,108,0.95)] p-7 text-white">
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight">{resume.fullName}</h2>
            <p className="mt-2 text-lg font-semibold text-[var(--color-accent)]">{resume.targetRole}</p>
            <p className="mt-4 text-sm leading-6 text-white/82">{resume.contactLine}</p>
            <div className="mt-8"><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-white/12 px-3 py-1 text-sm">{skill}</span>)}</div></div>
            <div className="mt-8"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-white/84">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
            {resume.certifications.length > 0 && <div className="mt-8"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-white/84">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </aside>
          <div className="p-8">
            <SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p>
            <div className="mt-8"><SectionTitle>Experience</SectionTitle><div className="mt-4 space-y-5">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-2xl border border-[var(--color-line)] p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div>
            <div className="mt-8"><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`} className="border-l-2 border-[rgba(190,72,26,0.16)] pl-4"><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div>
          </div>
        </div>
      </article>
    );
  }

  if (template === "modern") {
    return (
      <article className={wrapper}>
        <header className="rounded-[1.4rem] bg-[linear-gradient(135deg,#08606c_0%,#0d7a87_100%)] px-7 py-6 text-white">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-[family-name:var(--font-display)] text-4xl leading-none">{resume.fullName}</h2><p className="mt-2 text-lg font-semibold text-[var(--color-accent)]">{resume.targetRole}</p></div><p className="max-w-[320px] text-right text-sm leading-6 text-white/82">{resume.contactLine}</p></div>
        </header>
        <div className="mt-7 grid gap-6">
          <section className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Profile</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></section>
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full border border-[rgba(8,96,108,0.14)] bg-[rgba(8,96,108,0.05)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div>
            <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>
          <section className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Experience</SectionTitle><div className="mt-4 grid gap-4">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-[1.2rem] bg-[var(--color-paper)] p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></section>
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div>
            {resume.certifications.length > 0 && <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </section>
        </div>
      </article>
    );
  }

  return (
    <article className={wrapper}>
      <header className="border-b border-[var(--color-line)] pb-6">
        <h2 className="font-[family-name:var(--font-display)] text-4xl leading-none text-[var(--color-ink)]">{resume.fullName}</h2>
        <p className="mt-3 text-xl font-semibold text-[var(--color-dark)]">{resume.targetRole}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p>
      </header>
      <section className="mt-7"><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></section>
      <section className="mt-7 grid gap-7 md:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-7">
          <div><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div>
          {resume.certifications.length > 0 && <div><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <div><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
        <div className="space-y-7">
          <div><SectionTitle>Professional Experience</SectionTitle><div className="mt-4 space-y-5">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="border-l-2 border-[rgba(8,96,108,0.14)] pl-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="text-sm font-medium text-[var(--color-muted)]">{item.period}</p></div><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div>
          <div><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div>
        </div>
      </section>
    </article>
  );
}

export function ResumeBuilder() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [template, setTemplate] = useState<TemplateStyle>("executive");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleFieldChange = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateExperience = (id: string, field: keyof ExperienceInput, value: string) => setForm((current) => ({ ...current, experiences: current.experiences.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  const updateEducation = (id: string, field: keyof EducationInput, value: string) => setForm((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  const addExperience = () => setForm((current) => ({ ...current, experiences: [...current.experiences, createExperience()] }));
  const addEducation = () => setForm((current) => ({ ...current, education: [...current.education, createEducation()] }));
  const removeExperience = (id: string) => setForm((current) => ({ ...current, experiences: current.experiences.length === 1 ? [createExperience()] : current.experiences.filter((item) => item.id !== id) }));
  const removeEducation = (id: string) => setForm((current) => ({ ...current, education: current.education.length === 1 ? [createEducation()] : current.education.filter((item) => item.id !== id) }));

  const resetBuilder = () => {
    setForm(initialForm());
    setResume(null);
    setError("");
    setTemplate("executive");
  };

  const generateResume = async () => {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/resume-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, experiences: form.experiences.map((item) => ({ company: item.company, title: item.title, location: item.location, start: item.start, end: item.end, highlights: item.highlights })), education: form.education.map((item) => ({ institution: item.institution, degree: item.degree, year: item.year })) }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Resume generation failed.");
        setResume(payload.resume as ResumeData);
      } catch (generationError) {
        setResume(null);
        setError(generationError instanceof Error ? generationError.message : "Resume generation failed. Please try again.");
      }
    });
  };

  const downloadPdf = () => { if (resume) window.print(); };
  const downloadWord = () => { if (resume) downloadBlob(`${resume.fullName.replace(/\s+/g, "-").toLowerCase()}-resume.doc`, buildWordMarkup(resume), "application/msword"); };

  return (
    <section className="hero-surface">
      <div className="section-shell print-shell py-14 sm:py-18">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Resume Builder</p>
          <h1 className="section-title mt-4">Build a polished resume with a layout that fits your profile.</h1>
          <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">Fill in your details once, generate a structured resume instantly, switch between template styles, and export it as PDF or Word.</p>
        </div>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="soft-panel no-print p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Full Name</span><input value={form.fullName} onChange={(event) => handleFieldChange("fullName", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Your full name" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Target Role</span><input value={form.targetRole} onChange={(event) => handleFieldChange("targetRole", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Target role" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Email</span><input value={form.email} onChange={(event) => handleFieldChange("email", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="name@example.com" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Phone</span><input value={form.phone} onChange={(event) => handleFieldChange("phone", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Phone number" /></label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Location</span><input value={form.location} onChange={(event) => handleFieldChange("location", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Current city" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">LinkedIn</span><input value={form.linkedin} onChange={(event) => handleFieldChange("linkedin", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="LinkedIn URL" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Portfolio</span><input value={form.portfolio} onChange={(event) => handleFieldChange("portfolio", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Portfolio URL" /></label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Years of Experience</span><input value={form.yearsExperience} onChange={(event) => handleFieldChange("yearsExperience", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Years of experience" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Certifications</span><input value={form.certifications} onChange={(event) => handleFieldChange("certifications", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="PMP, Lean Six Sigma, SAP" /></label>
            </div>

            <div className="mt-5 space-y-5">
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Core Skills</span><textarea value={form.skills} onChange={(event) => handleFieldChange("skills", event.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="ERP, Stakeholder Management, Delivery Planning, Reporting" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Career Notes / Achievements</span><textarea value={form.professionalNotes} onChange={(event) => handleFieldChange("professionalNotes", event.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Add promotions, awards, projects, outcomes, or specific strengths to emphasize." /></label>
            </div>

            <div className="mt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-[var(--color-ink)]">Experience</h2><button type="button" onClick={addExperience} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Add Experience</button></div><div className="mt-4 space-y-4">{form.experiences.map((item, index) => <div key={item.id} className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><p className="eyebrow !tracking-[0.18em]">Experience {index + 1}</p><button type="button" onClick={() => removeExperience(item.id)} className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-accent-strong)]">Remove</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><input value={item.company} onChange={(event) => updateExperience(item.id, "company", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Company" /><input value={item.title} onChange={(event) => updateExperience(item.id, "title", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Title" /></div><div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_0.6fr_0.6fr]"><input value={item.location} onChange={(event) => updateExperience(item.id, "location", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Location" /><input value={item.start} onChange={(event) => updateExperience(item.id, "start", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Start" /><input value={item.end} onChange={(event) => updateExperience(item.id, "end", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="End / Present" /></div><textarea value={item.highlights} onChange={(event) => updateExperience(item.id, "highlights", event.target.value)} rows={4} className="mt-4 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Write your current bullets, achievements, responsibilities, tools used, impact, team size, etc." /></div>)}</div></div>

            <div className="mt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-[var(--color-ink)]">Education</h2><button type="button" onClick={addEducation} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Add Education</button></div><div className="mt-4 space-y-4">{form.education.map((item) => <div key={item.id} className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_0.55fr_auto]"><input value={item.institution} onChange={(event) => updateEducation(item.id, "institution", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Institution" /><input value={item.degree} onChange={(event) => updateEducation(item.id, "degree", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Degree" /><input value={item.year} onChange={(event) => updateEducation(item.id, "year", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Year" /><button type="button" onClick={() => removeEducation(item.id)} className="self-center text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-accent-strong)]">Remove</button></div></div>)}</div></div>

            <div className="mt-8 flex flex-wrap items-center gap-3"><button type="button" onClick={generateResume} disabled={isPending} className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Generating..." : "Generate Resume"}</button><button type="button" onClick={resetBuilder} className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Reset</button></div>
            {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
          </div>

          <aside className="space-y-5">
            <div className="soft-panel no-print p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Template Style</p><p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Choose the resume layout that best matches the candidate profile.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadPdf} disabled={!resume} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-50">Download PDF</button><button type="button" onClick={downloadWord} disabled={!resume} className="rounded-2xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-accent-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50">Download Word</button></div></div>
              <div className="mt-5 grid gap-3">{templateCards.map((item) => { const active = template === item.key; return <button key={item.key} type="button" onClick={() => setTemplate(item.key)} className={`rounded-[1.25rem] border p-4 text-left transition ${active ? "border-[var(--color-dark)] bg-[rgba(8,96,108,0.08)]" : "border-[var(--color-line)] bg-white hover:border-[rgba(8,96,108,0.22)]"}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p></button>; })}</div>
            </div>

            {resume ? <ResumePreview resume={resume} template={template} /> : <div className="soft-panel p-8 text-center"><p className="eyebrow">Live Preview</p><h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-ink)]">Your generated resume will appear here.</h2><p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">Complete the form, generate the resume, then switch between templates and export the final result as PDF or Word.</p></div>}
          </aside>
        </div>
      </div>
    </section>
  );
}

