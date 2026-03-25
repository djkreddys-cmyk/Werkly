"use client";

import Image from "next/image";
import { type ChangeEvent, type ReactNode, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type ExperienceInput = {
  id: string;
  company: string;
  title: string;
  location: string;
  joinedMonth: string;
  joinedYear: string;
  exitMonth: string;
  exitYear: string;
  highlights: string;
};

type EducationInput = {
  id: string;
  institution: string;
  degree: string;
  year: string;
};

type TemplateStyle =
  | "executive"
  | "sidebar"
  | "modern"
  | "minimal"
  | "spotlight"
  | "boardroom"
  | "atlas"
  | "classic"
  | "contrast"
  | "timeline";

type PersonalInfoItem = {
  label: string;
  value: string;
};

type ResumeData = {
  fullName: string;
  targetRole: string;
  contactLine: string;
  personalInfo: PersonalInfoItem[];
  headline: string;
  summary: string;
  coreSkills: string[];
  strengths: string[];
  experience: Array<{
    company: string;
    title: string;
    location: string;
    period: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    details?: string;
  }>;
  certifications: string[];
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  alternativeNumber: string;
  location: string;
  address: string;
  dateOfBirth: string;
  nationality: string;
  languages: string;
  linkedin: string;
  portfolio: string;
  yearsExperience: string;
  professionalNotes: string;
  skills: string;
  certifications: string;
  photoDataUrl: string;
  photoName: string;
  experiences: ExperienceInput[];
  education: EducationInput[];
};

const templateCards: Array<{ key: TemplateStyle; title: string; description: string }> = [
  { key: "executive", title: "Executive", description: "Classic business resume with balanced detail." },
  { key: "sidebar", title: "Sidebar", description: "Strong profile column with a polished left rail." },
  { key: "modern", title: "Modern", description: "Card-based layout with sharper section separation." },
  { key: "minimal", title: "Minimal", description: "Quiet ATS-friendly layout with softer styling." },
  { key: "spotlight", title: "Spotlight", description: "Bolder header with the candidate photo leading." },
  { key: "boardroom", title: "Boardroom", description: "A heavier executive treatment for senior profiles." },
  { key: "atlas", title: "Atlas", description: "A crisper banded layout with stronger structure." },
  { key: "classic", title: "Classic", description: "A more traditional and formal resume presentation." },
  { key: "contrast", title: "Contrast", description: "A warmer highlight scheme with stronger visual separation." },
  { key: "timeline", title: "Timeline", description: "An experience-first layout that emphasizes chronology." }
];

const createExperience = (): ExperienceInput => ({
  id: crypto.randomUUID(),
  company: "",
  title: "",
  location: "",
  joinedMonth: "",
  joinedYear: "",
  exitMonth: "",
  exitYear: "",
  highlights: ""
});

const createEducation = (): EducationInput => ({
  id: crypto.randomUUID(),
  institution: "",
  degree: "",
  year: ""
});

const initialForm = (): FormState => ({
  fullName: "",
  email: "",
  phone: "",
  alternativeNumber: "",
  location: "",
  address: "",
  dateOfBirth: "",
  nationality: "",
  languages: "",
  linkedin: "",
  portfolio: "",
  yearsExperience: "",
  professionalNotes: "",
  skills: "",
  certifications: "",
  photoDataUrl: "",
  photoName: "",
  experiences: [createExperience()],
  education: [createEducation()]
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function candidateImageMarkup(photoDataUrl?: string) {
  if (!photoDataUrl) return "";
  return `<img src="${photoDataUrl}" alt="Candidate photo" class="photo" />`;
}

function getNormalizedTemplate(template: TemplateStyle) {
  if (template === "boardroom") return "sidebar" as const;
  if (template === "atlas") return "modern" as const;
  if (template === "classic" || template === "timeline") return "executive" as const;
  if (template === "contrast") return "spotlight" as const;
  return template;
}

function buildPersonalInfoMarkup(items: PersonalInfoItem[]) {
  return items
    .filter((item) => item.value)
    .map(
      (item) =>
        `<div class="info-row"><span class="info-label">${escapeHtml(item.label)}</span><span>${escapeHtml(item.value)}</span></div>`
    )
    .join("");
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

function buildWordMarkup(resume: ResumeData, template: TemplateStyle, photoDataUrl?: string) {
  return buildPdfMarkup(resume, template, photoDataUrl);
}
function buildPdfMarkup(resume: ResumeData, template: TemplateStyle, photoDataUrl?: string) {
  const normalizedTemplate = getNormalizedTemplate(template);
  const skillsMarkup = resume.coreSkills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join("");
  const strengthsMarkup = resume.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const certificationsMarkup = resume.certifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const personalInfoMarkup = buildPersonalInfoMarkup(resume.personalInfo);
  const experienceMarkup = resume.experience.map((item) => `<section class="experience-item"><div class="experience-head"><div><h4>${escapeHtml(item.title)}</h4><p class="role-meta">${escapeHtml([item.company, item.location].filter(Boolean).join(" | "))}</p></div><p class="period">${escapeHtml(item.period)}</p></div><ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul></section>`).join("");
  const educationMarkup = resume.education.map((item) => `<div class="education-item"><h4>${escapeHtml(item.degree || item.institution)}</h4><p>${escapeHtml([item.institution, item.year].filter(Boolean).join(" | "))}</p></div>`).join("");
  const photo = candidateImageMarkup(photoDataUrl);

  if (normalizedTemplate === "sidebar") return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(resume.fullName)} Resume</title><style>@page{size:A4;margin:14mm}body{font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#17353d;margin:0}*{box-sizing:border-box}h1,h2,h3,h4,p{margin:0}ul{margin:8px 0 0 18px;padding:0}.sheet{display:grid;grid-template-columns:33% 67%}.sidebar{background:#08606c;color:#fff;padding:28px 24px}.main{padding:28px}.name{font-size:30px;line-height:1.08;font-weight:700}.role{margin-top:8px;font-size:18px;font-weight:700;color:#f1a64b}.contact{margin-top:16px;font-size:12px;line-height:1.65;color:rgba(255,255,255,.86)}.photo-wrap{margin-bottom:18px}.photo{width:100px;height:100px;border-radius:18px;object-fit:cover;border:2px solid rgba(255,255,255,.18)}.label{margin-top:24px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#f1a64b;font-weight:700}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.chip{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px}.block-list{margin-top:10px;font-size:13px;line-height:1.65}.block-list li{margin-bottom:6px}.summary{font-size:14px;line-height:1.7;margin-top:12px}.experience-item{border:1px solid rgba(8,96,108,.12);border-radius:16px;padding:18px;margin-top:16px;break-inside:avoid}.experience-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.experience-head h4{font-size:18px}.role-meta,.period,.education-item p{font-size:12px;color:#5b6b72}.experience-item ul li{margin-bottom:6px;font-size:13px;line-height:1.6}.education-item{margin-top:12px;padding-left:12px;border-left:2px solid rgba(190,72,26,.22)}.section-title{margin-top:6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#be481a;font-weight:700}.info-grid{display:grid;gap:12px;margin-top:12px}.info-row{padding:10px 12px;border:1px solid rgba(8,96,108,.12);border-radius:12px;background:#fff}.info-label{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#be481a;font-weight:700;margin-bottom:4px}</style></head><body><div class="sheet"><aside class="sidebar">${photo ? `<div class="photo-wrap">${photo}</div>` : ""}<h1 class="name">${escapeHtml(resume.fullName)}</h1><p class="role">${escapeHtml(resume.targetRole)}</p><p class="contact">${escapeHtml(resume.contactLine)}</p><p class="label">Core Skills</p><div class="chips">${skillsMarkup}</div><p class="label">Strengths</p><ul class="block-list">${strengthsMarkup}</ul>${resume.certifications.length ? `<p class="label">Certifications</p><ul class="block-list">${certificationsMarkup}</ul>` : ""}</aside><main class="main"><p class="section-title">Professional Summary</p><p class="summary">${escapeHtml(resume.summary)}</p><p class="section-title" style="margin-top:24px">Experience</p>${experienceMarkup}<p class="section-title" style="margin-top:24px">Education</p>${educationMarkup}<p class="section-title" style="margin-top:24px">Personal Information</p><div class="info-grid">${personalInfoMarkup}</div></main></div></body></html>`;
  if (normalizedTemplate === "modern") return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(resume.fullName)} Resume</title><style>@page{size:A4;margin:14mm}body{font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#17353d;margin:0}*{box-sizing:border-box}h1,h2,h3,h4,p{margin:0}ul{margin:8px 0 0 18px;padding:0}.hero{background:linear-gradient(135deg,#08606c 0%,#0d7a87 100%);color:#fff;border-radius:20px;padding:24px 26px}.hero-row{display:flex;justify-content:space-between;gap:16px;align-items:flex-end}.hero-left{display:flex;gap:16px;align-items:center}.photo{width:88px;height:88px;border-radius:16px;object-fit:cover;border:2px solid rgba(255,255,255,.18)}.name{font-size:30px;line-height:1.05;font-weight:700}.role{margin-top:8px;font-size:18px;font-weight:700;color:#f1a64b}.contact{max-width:280px;text-align:right;font-size:12px;line-height:1.7;color:rgba(255,255,255,.86)}.grid{display:grid;gap:16px;margin-top:18px}.two{grid-template-columns:1fr 1fr}.card{border:1px solid rgba(8,96,108,.12);border-radius:18px;padding:18px;background:#fff;break-inside:avoid}.soft{background:#f8f4ee}.label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#be481a;font-weight:700}.summary{margin-top:10px;font-size:14px;line-height:1.7}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.chip{padding:6px 10px;border-radius:999px;border:1px solid rgba(8,96,108,.14);background:rgba(8,96,108,.05);font-size:12px;color:#08606c;font-weight:700}.list{margin-top:12px;font-size:13px;line-height:1.6}.list li{margin-bottom:6px}.experience-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.experience-head h4{font-size:18px}.role-meta,.period,.education-item p{font-size:12px;color:#5b6b72}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.info-row{padding:10px 12px;border:1px solid rgba(8,96,108,.12);border-radius:12px;background:#fff}.info-label{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#be481a;font-weight:700;margin-bottom:4px}</style></head><body><section class="hero"><div class="hero-row"><div class="hero-left">${photo || ""}<div><h1 class="name">${escapeHtml(resume.fullName)}</h1><p class="role">${escapeHtml(resume.targetRole)}</p></div></div><p class="contact">${escapeHtml(resume.contactLine)}</p></div></section><div class="grid"><section class="card"><p class="label">Profile</p><p class="summary">${escapeHtml(resume.summary)}</p></section><div class="grid two"><section class="card"><p class="label">Skills</p><div class="chips">${skillsMarkup}</div></section><section class="card"><p class="label">Strengths</p><ul class="list">${strengthsMarkup}</ul></section></div><section class="card"><p class="label">Experience</p>${resume.experience.map((item) => `<div class="card soft" style="margin-top:14px"><div class="experience-head"><div><h4>${escapeHtml(item.title)}</h4><p class="role-meta">${escapeHtml([item.company, item.location].filter(Boolean).join(" | "))}</p></div><p class="period">${escapeHtml(item.period)}</p></div><ul class="list">${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul></div>`).join("")}</section><div class="grid two"><section class="card"><p class="label">Education</p>${educationMarkup}</section>${resume.certifications.length ? `<section class="card"><p class="label">Certifications</p><ul class="list">${certificationsMarkup}</ul></section>` : ""}</div><section class="card"><p class="label">Personal Information</p><div class="info-grid">${personalInfoMarkup}</div></section></div></body></html>`;
  if (normalizedTemplate === "minimal") return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(resume.fullName)} Resume</title><style>@page{size:A4;margin:14mm}body{font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#17353d;margin:0}*{box-sizing:border-box}h1,h2,h3,h4,p{margin:0}ul{margin:8px 0 0 18px;padding:0}.top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.name{font-size:28px;line-height:1.05;font-weight:700}.role{margin-top:6px;font-size:16px;font-weight:700;color:#08606c}.contact{margin-top:12px;font-size:12px;line-height:1.7;color:#5b6b72}.photo{width:86px;height:86px;border-radius:50%;object-fit:cover;border:1px solid rgba(8,96,108,.15)}.label{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#be481a;font-weight:700;margin-top:20px}.summary{margin-top:10px;font-size:13px;line-height:1.75}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.chip{padding:5px 10px;border-radius:999px;background:rgba(8,96,108,.06);font-size:12px;color:#08606c}.experience-item,.education-item{margin-top:14px;padding-top:14px;border-top:1px solid rgba(8,96,108,.1);break-inside:avoid}.experience-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.experience-head h4{font-size:17px}.role-meta,.period,.education-item p{font-size:12px;color:#5b6b72}.list{margin-top:10px;font-size:13px;line-height:1.6}.list li{margin-bottom:6px}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.info-row{padding:10px 12px;border:1px solid rgba(8,96,108,.12);border-radius:12px;background:#fff}.info-label{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#be481a;font-weight:700;margin-bottom:4px}</style></head><body><div class="top"><div><h1 class="name">${escapeHtml(resume.fullName)}</h1><p class="role">${escapeHtml(resume.targetRole)}</p><p class="contact">${escapeHtml(resume.contactLine)}</p></div>${photo || ""}</div><p class="label">Professional Summary</p><p class="summary">${escapeHtml(resume.summary)}</p><p class="label">Core Skills</p><div class="chips">${skillsMarkup}</div><p class="label">Experience</p>${experienceMarkup}<p class="label">Education</p>${educationMarkup}${resume.certifications.length ? `<p class="label">Certifications</p><ul class="list">${certificationsMarkup}</ul>` : ""}<p class="label">Personal Information</p><div class="info-grid">${personalInfoMarkup}</div></body></html>`;
  if (normalizedTemplate === "spotlight") return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(resume.fullName)} Resume</title><style>@page{size:A4;margin:14mm}body{font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#17353d;margin:0}*{box-sizing:border-box}h1,h2,h3,h4,p{margin:0}ul{margin:8px 0 0 18px;padding:0}.hero{display:grid;grid-template-columns:120px 1fr;gap:18px;align-items:center;padding:0 0 20px;border-bottom:2px solid rgba(8,96,108,.12)}.photo{width:120px;height:120px;border-radius:20px;object-fit:cover;border:2px solid rgba(8,96,108,.14)}.name{font-size:32px;line-height:1.02;font-weight:700}.role{margin-top:8px;font-size:18px;font-weight:700;color:#be481a}.contact{margin-top:10px;font-size:12px;line-height:1.7;color:#5b6b72}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}.card{border:1px solid rgba(8,96,108,.12);border-radius:18px;padding:18px;break-inside:avoid}.label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#08606c;font-weight:700}.summary{margin-top:10px;font-size:14px;line-height:1.7}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.chip{padding:6px 10px;border-radius:999px;background:rgba(190,72,26,.08);font-size:12px;color:#be481a;font-weight:700}.experience-item{margin-top:14px;padding:14px;border-radius:14px;background:#f8f4ee}.experience-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.experience-head h4{font-size:18px}.role-meta,.period,.education-item p{font-size:12px;color:#5b6b72}.list{margin-top:10px;font-size:13px;line-height:1.6}.list li{margin-bottom:6px}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.info-row{padding:10px 12px;border:1px solid rgba(8,96,108,.12);border-radius:12px;background:#fff}.info-label{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#be481a;font-weight:700;margin-bottom:4px}</style></head><body><div class="hero">${photo || `<div style="width:120px;height:120px;border-radius:20px;background:rgba(8,96,108,.08)"></div>`}<div><h1 class="name">${escapeHtml(resume.fullName)}</h1><p class="role">${escapeHtml(resume.targetRole)}</p><p class="contact">${escapeHtml(resume.contactLine)}</p></div></div><div class="grid"><section class="card"><p class="label">Strengths</p><ul class="list">${strengthsMarkup}</ul></section><section class="card"><p class="label">Professional Summary</p><p class="summary">${escapeHtml(resume.summary)}</p><p class="label" style="margin-top:20px">Core Skills</p><div class="chips">${skillsMarkup}</div>${resume.certifications.length ? `<p class="label" style="margin-top:20px">Certifications</p><ul class="list">${certificationsMarkup}</ul>` : ""}</section></div><section class="card" style="margin-top:18px"><p class="label">Experience</p>${resume.experience.map((item) => `<div class="experience-item"><div class="experience-head"><div><h4>${escapeHtml(item.title)}</h4><p class="role-meta">${escapeHtml([item.company, item.location].filter(Boolean).join(" | "))}</p></div><p class="period">${escapeHtml(item.period)}</p></div><ul class="list">${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul></div>`).join("")}</section><section class="card" style="margin-top:18px"><p class="label">Education</p>${educationMarkup}</section><section class="card" style="margin-top:18px"><p class="label">Personal Information</p><div class="info-grid">${personalInfoMarkup}</div></section></body></html>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(resume.fullName)} Resume</title><style>@page{size:A4;margin:14mm}body{font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#17353d;margin:0}*{box-sizing:border-box}h1,h2,h3,h4,p{margin:0}ul{margin:8px 0 0 18px;padding:0}.top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.top-left{display:flex;gap:16px;align-items:flex-start}.photo{width:92px;height:92px;border-radius:16px;object-fit:cover;border:1px solid rgba(8,96,108,.14)}.name{font-size:30px;line-height:1.05;font-weight:700}.role{margin-top:8px;font-size:18px;font-weight:700;color:#08606c}.contact{margin-top:12px;font-size:12px;line-height:1.7;color:#5b6b72}.divider{height:1px;background:rgba(8,96,108,.12);margin:20px 0}.label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#be481a;font-weight:700}.summary{margin-top:10px;font-size:14px;line-height:1.7}.grid{display:grid;grid-template-columns:32% 68%;gap:24px;margin-top:22px}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.chip{padding:6px 10px;border-radius:999px;background:rgba(8,96,108,.08);font-size:12px;color:#08606c;font-weight:700}.list{margin-top:12px;font-size:13px;line-height:1.6}.list li{margin-bottom:6px}.experience-item{border-left:2px solid rgba(8,96,108,.14);padding-left:16px;margin-top:16px;break-inside:avoid}.experience-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.experience-head h4{font-size:18px}.role-meta,.period,.education-item p{font-size:12px;color:#5b6b72}.education-item{margin-top:12px}.info-grid{display:grid;gap:12px;margin-top:12px}.info-row{padding:10px 12px;border:1px solid rgba(8,96,108,.12);border-radius:12px;background:#fff}.info-label{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#be481a;font-weight:700;margin-bottom:4px}</style></head><body><div class="top"><div class="top-left">${photo || ""}<div><h1 class="name">${escapeHtml(resume.fullName)}</h1><p class="role">${escapeHtml(resume.targetRole)}</p><p class="contact">${escapeHtml(resume.contactLine)}</p></div></div></div><div class="divider"></div><p class="label">Professional Summary</p><p class="summary">${escapeHtml(resume.summary)}</p><div class="grid"><div><p class="label">Core Skills</p><div class="chips">${skillsMarkup}</div>${resume.certifications.length ? `<p class="label" style="margin-top:24px">Certifications</p><ul class="list">${certificationsMarkup}</ul>` : ""}<p class="label" style="margin-top:24px">Strengths</p><ul class="list">${strengthsMarkup}</ul></div><div><p class="label">Professional Experience</p>${experienceMarkup}<p class="label" style="margin-top:24px">Education</p>${educationMarkup}<p class="label" style="margin-top:24px">Personal Information</p><div class="info-grid">${personalInfoMarkup}</div></div></div></body></html>`;
}

function SectionTitle({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${inverse ? "text-[var(--color-accent)]" : "text-[var(--color-accent-strong)]"}`}>
      {children}
    </p>
  );
}

function PreviewShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <article
      className={`print-preview rounded-[1.8rem] bg-white shadow-[0_18px_50px_rgba(15,47,54,0.1)] ${className || ""}`}
      style={{ fontFamily: "Calibri, 'Segoe UI', Arial, Helvetica, sans-serif" }}
    >
      {children}
    </article>
  );
}

function PhotoBadge({ photoDataUrl, size = "md" }: { photoDataUrl?: string; size?: "sm" | "md" | "lg" }) {
  if (!photoDataUrl) return null;
  const classes = size === "lg" ? "h-28 w-28 rounded-[1.2rem]" : size === "sm" ? "h-16 w-16 rounded-xl" : "h-20 w-20 rounded-[1rem]";
  return <Image src={photoDataUrl} alt="Candidate" width={112} height={112} unoptimized className={`${classes} object-cover border border-[rgba(8,96,108,0.14)] bg-[var(--color-paper)]`} />;
}

function PersonalInfoPanel({ items, compact = false }: { items: PersonalInfoItem[]; compact?: boolean }) {
  const list = items.filter((item) => item.value);
  if (!list.length) return null;

  return (
    <div>
      <SectionTitle>Personal Information</SectionTitle>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        {list.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className={`rounded-2xl border px-4 py-3 ${
              compact ? "border-white/12 bg-white/10 text-white" : "border-[var(--color-line)] bg-white"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                compact ? "text-white/68" : "text-[var(--color-accent-strong)]"
              }`}
            >
              {item.label}
            </p>
            <p className={`mt-1 text-sm leading-6 ${compact ? "text-white" : "text-[var(--color-ink)]"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumePreview({ resume, template, photoDataUrl }: { resume: ResumeData; template: TemplateStyle; photoDataUrl?: string }) {
  const normalizedTemplate = getNormalizedTemplate(template);

  if (template === "boardroom") {
    return <PreviewShell className="overflow-hidden"><div className="grid md:grid-cols-[1.2fr_0.8fr]"><div className="bg-[linear-gradient(135deg,rgba(8,96,108,0.98),rgba(7,70,80,0.98))] p-8 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">Executive Profile</p><h2 className="mt-4 text-4xl font-semibold leading-[1.02]">{resume.fullName}</h2><p className="mt-3 text-xl font-semibold text-[var(--color-accent)]">{resume.targetRole}</p><p className="mt-4 max-w-xl text-sm leading-7 text-white/80">{resume.contactLine}</p></div><PhotoBadge photoDataUrl={photoDataUrl} size="md" /></div><div className="mt-8 grid gap-5 lg:grid-cols-2"><div className="rounded-[1.35rem] border border-white/12 bg-white/6 p-5"><SectionTitle inverse>Professional Summary</SectionTitle><p className="mt-3 text-sm leading-7 text-white/82">{resume.summary}</p></div><div className="rounded-[1.35rem] border border-white/12 bg-white/6 p-5"><SectionTitle inverse>Core Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-white/82">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div><div className="bg-white p-8"><SectionTitle>Experience</SectionTitle><div className="mt-4 space-y-4">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-[1.2rem] border border-[var(--color-line)] p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div><div className="mt-7"><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`} className="border-l-2 border-[rgba(190,72,26,0.16)] pl-4"><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div>{resume.certifications.length > 0 && <div className="mt-7"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}<div className="mt-7"><PersonalInfoPanel items={resume.personalInfo} /></div></div></div></PreviewShell>;
  }

  if (template === "atlas") {
    return <PreviewShell className="p-8"><div className="rounded-[1.8rem] border border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(8,96,108,0.08),rgba(255,255,255,0.95))] p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-4"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><div><p className="eyebrow">Atlas Layout</p><h2 className="mt-3 text-4xl font-semibold leading-none text-[var(--color-ink)]">{resume.fullName}</h2><p className="mt-2 text-lg font-semibold text-[var(--color-dark)]">{resume.targetRole}</p></div></div><p className="max-w-[300px] text-right text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p></div><div className="mt-6 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]"><div className="space-y-5"><div className="rounded-[1.3rem] bg-white p-5 shadow-[0_12px_28px_rgba(15,47,54,0.06)]"><SectionTitle>Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div>{resume.certifications.length > 0 && <div className="rounded-[1.3rem] bg-white p-5 shadow-[0_12px_28px_rgba(15,47,54,0.06)]"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div><div className="space-y-5"><div className="rounded-[1.3rem] bg-white p-6 shadow-[0_12px_28px_rgba(15,47,54,0.06)]"><SectionTitle>Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></div><div className="rounded-[1.3rem] bg-white p-6 shadow-[0_12px_28px_rgba(15,47,54,0.06)]"><SectionTitle>Experience Journey</SectionTitle><div className="mt-4 space-y-5">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="relative border-l-2 border-[rgba(8,96,108,0.14)] pl-5"><span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-[var(--color-brand-cyan)]" /><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div className="rounded-[1.3rem] bg-white p-6 shadow-[0_12px_28px_rgba(15,47,54,0.06)]"><SectionTitle>Education</SectionTitle><div className="mt-3 grid gap-3 md:grid-cols-2">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`} className="rounded-2xl border border-[var(--color-line)] p-4"><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><div className="rounded-[1.3rem] bg-white p-6 shadow-[0_12px_28px_rgba(15,47,54,0.06)]"><PersonalInfoPanel items={resume.personalInfo} /></div></div></div></div></PreviewShell>;
  }

  if (template === "classic") {
    return <PreviewShell className="p-10"><div className="border-b-4 border-[rgba(190,72,26,0.14)] pb-6"><div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-[2.65rem] font-semibold leading-none text-[var(--color-ink)]">{resume.fullName}</h2><p className="mt-3 text-lg font-semibold text-[var(--color-dark)]">{resume.targetRole}</p><p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p></div><PhotoBadge photoDataUrl={photoDataUrl} size="md" /></div></div><div className="mt-7 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]"><div className="space-y-7"><div><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></div><div><SectionTitle>Experience</SectionTitle><div className="mt-4 space-y-6">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="border-b border-[var(--color-line)] pb-5 last:border-b-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div></div><aside className="space-y-6"><div className="rounded-[1.4rem] bg-[var(--color-paper)] p-6"><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full border border-[rgba(8,96,108,0.12)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div><div className="rounded-[1.4rem] bg-[var(--color-paper)] p-6"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>{resume.certifications.length > 0 && <div className="rounded-[1.4rem] bg-[var(--color-paper)] p-6"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}<PersonalInfoPanel items={resume.personalInfo} /></aside></div></PreviewShell>;
  }

  if (template === "contrast") {
    return <PreviewShell className="overflow-hidden"><div className="grid md:grid-cols-[0.95fr_1.05fr]"><div className="bg-[linear-gradient(180deg,rgba(190,72,26,0.95),rgba(164,59,25,0.98))] p-8 text-white"><div className="flex items-center gap-4"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><div><h2 className="text-4xl font-semibold leading-none">{resume.fullName}</h2><p className="mt-2 text-lg font-semibold text-white/88">{resume.targetRole}</p></div></div><p className="mt-5 text-sm leading-7 text-white/82">{resume.contactLine}</p><div className="mt-8 rounded-[1.35rem] bg-white/10 p-5"><SectionTitle inverse>Professional Summary</SectionTitle><p className="mt-3 text-sm leading-7 text-white/84">{resume.summary}</p></div><div className="mt-6"><SectionTitle inverse>Core Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-white/84">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="bg-white p-8"><div className="grid gap-6 lg:grid-cols-2"><div><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(190,72,26,0.08)] px-3 py-1 text-sm font-medium text-[var(--color-accent-strong)]">{skill}</span>)}</div></div>{resume.certifications.length > 0 && <div><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div><div className="mt-7"><SectionTitle>Experience</SectionTitle><div className="mt-4 grid gap-4">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-[1.25rem] border border-[var(--color-line)] p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div className="mt-7"><SectionTitle>Education</SectionTitle><div className="mt-3 grid gap-3 md:grid-cols-2">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`} className="rounded-2xl border border-[var(--color-line)] p-4"><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><div className="mt-7"><PersonalInfoPanel items={resume.personalInfo} /></div></div></div></PreviewShell>;
  }

  if (template === "timeline") {
    return <PreviewShell className="p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><div><p className="eyebrow">Timeline View</p><h2 className="mt-3 text-4xl font-semibold leading-none text-[var(--color-ink)]">{resume.fullName}</h2><p className="mt-2 text-lg font-semibold text-[var(--color-dark)]">{resume.targetRole}</p><p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p></div></div><div className="max-w-sm rounded-[1.35rem] bg-[var(--color-paper)] p-5"><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">{resume.summary}</p></div></div><div className="mt-8 grid gap-7 lg:grid-cols-[1.28fr_0.72fr]"><div><SectionTitle>Career Timeline</SectionTitle><div className="mt-5 space-y-6">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="relative border-l-2 border-[rgba(8,96,108,0.16)] pl-6"><span className="absolute -left-[8px] top-1 h-3.5 w-3.5 rounded-full bg-[var(--color-accent-strong)]" /><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="rounded-full bg-[rgba(8,96,108,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><aside className="space-y-6"><div className="rounded-[1.35rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div><div className="rounded-[1.35rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-[1.35rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><PersonalInfoPanel items={resume.personalInfo} /></aside></div></PreviewShell>;
  }

  if (normalizedTemplate === "sidebar") {
    return <PreviewShell className="overflow-hidden"><div className="grid md:grid-cols-[0.72fr_1.28fr]"><aside className="bg-[rgba(8,96,108,0.95)] p-7 text-white"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><h2 className="mt-5 text-3xl font-semibold leading-tight">{resume.fullName}</h2><p className="mt-2 text-lg font-semibold text-[var(--color-accent)]">{resume.targetRole}</p><p className="mt-4 text-sm leading-6 text-white/82">{resume.contactLine}</p><div className="mt-8"><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-white/12 px-3 py-1 text-sm text-white">{skill}</span>)}</div></div><div className="mt-8"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-white/84">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>{resume.certifications.length > 0 && <div className="mt-8"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-white/84">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}</aside><div className="p-8"><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p><div className="mt-8"><SectionTitle>Experience</SectionTitle><div className="mt-4 space-y-5">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-2xl border border-[var(--color-line)] p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div className="mt-8"><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`} className="border-l-2 border-[rgba(190,72,26,0.16)] pl-4"><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><div className="mt-8"><PersonalInfoPanel items={resume.personalInfo} compact /></div></div></div></PreviewShell>;
  }

  if (normalizedTemplate === "modern") {
    return <PreviewShell className="p-8"><header className="rounded-[1.4rem] bg-[linear-gradient(135deg,#08606c_0%,#0d7a87_100%)] px-7 py-6 text-white"><div className="flex flex-wrap items-end justify-between gap-4"><div className="flex items-center gap-4"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><div><h2 className="text-4xl font-semibold leading-none">{resume.fullName}</h2><p className="mt-2 text-lg font-semibold text-[var(--color-accent)]">{resume.targetRole}</p></div></div><p className="max-w-[320px] text-right text-sm leading-6 text-white/82">{resume.contactLine}</p></div></header><div className="mt-7 grid gap-6"><section className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Profile</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></section><section className="grid gap-6 md:grid-cols-2"><div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full border border-[rgba(8,96,108,0.14)] bg-[rgba(8,96,108,0.05)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div><div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div></section><section className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Experience</SectionTitle><div className="mt-4 grid gap-4">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-[1.2rem] bg-[var(--color-paper)] p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></section><section className="grid gap-6 md:grid-cols-2"><div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div>{resume.certifications.length > 0 && <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}</section><section className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><PersonalInfoPanel items={resume.personalInfo} /></section></div></PreviewShell>;
  }

  if (normalizedTemplate === "minimal") {
    return <PreviewShell className="p-8"><div className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--color-line)] pb-6"><div className="flex items-start gap-4"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><div><h2 className="text-4xl font-semibold leading-none text-[var(--color-ink)]">{resume.fullName}</h2><p className="mt-3 text-xl font-semibold text-[var(--color-dark)]">{resume.targetRole}</p><p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p></div></div></div><div className="mt-6"><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></div><div className="mt-7"><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(8,96,108,0.06)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div><div className="mt-7"><SectionTitle>Professional Experience</SectionTitle><div className="mt-4 space-y-5">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="border-t border-[var(--color-line)] pt-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="text-sm font-medium text-[var(--color-muted)]">{item.period}</p></div><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div className="mt-7 grid gap-7 md:grid-cols-2"><div><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><div><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul>{resume.certifications.length > 0 && <><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></>}</div><div className="md:col-span-2"><PersonalInfoPanel items={resume.personalInfo} /></div></div></PreviewShell>;
  }

  if (normalizedTemplate === "spotlight") {
    return <PreviewShell className="p-8"><div className="grid gap-6 md:grid-cols-[124px_1fr]"><div className="flex justify-center md:justify-start">{photoDataUrl ? <PhotoBadge photoDataUrl={photoDataUrl} size="lg" /> : <div className="h-28 w-28 rounded-[1.2rem] bg-[rgba(8,96,108,0.08)]" />}</div><div><h2 className="text-4xl font-semibold leading-none text-[var(--color-ink)]">{resume.fullName}</h2><p className="mt-3 text-xl font-semibold text-[var(--color-accent-strong)]">{resume.targetRole}</p><p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p><div className="mt-5 rounded-[1.3rem] bg-[var(--color-paper)] p-5"><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></div></div></div><div className="mt-7 grid gap-6 md:grid-cols-2"><div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(190,72,26,0.08)] px-3 py-1 text-sm font-medium text-[var(--color-accent-strong)]">{skill}</span>)}</div></div><div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-6"><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="mt-7"><SectionTitle>Professional Experience</SectionTitle><div className="mt-4 grid gap-4">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="rounded-[1.2rem] bg-[var(--color-paper)] p-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p></div><p className="text-sm text-[var(--color-muted)]">{item.period}</p></div><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div className="mt-7 grid gap-7 md:grid-cols-2"><div><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><div>{resume.certifications.length > 0 && <><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></>}</div><div className="md:col-span-2"><PersonalInfoPanel items={resume.personalInfo} /></div></div></PreviewShell>;
  }

  return <PreviewShell className="p-8"><header className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--color-line)] pb-6"><div className="flex items-start gap-4"><PhotoBadge photoDataUrl={photoDataUrl} size="md" /><div><h2 className="text-4xl font-semibold leading-none text-[var(--color-ink)]">{resume.fullName}</h2><p className="mt-3 text-xl font-semibold text-[var(--color-dark)]">{resume.targetRole}</p><p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{resume.contactLine}</p></div></div></header><section className="mt-7"><SectionTitle>Professional Summary</SectionTitle><p className="mt-3 text-[15px] leading-7 text-[var(--color-ink)]">{resume.summary}</p></section><section className="mt-7 grid gap-7 md:grid-cols-[0.8fr_1.2fr]"><div className="space-y-7"><div><SectionTitle>Core Skills</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{resume.coreSkills.map((skill) => <span key={skill} className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-sm font-medium text-[var(--color-dark)]">{skill}</span>)}</div></div>{resume.certifications.length > 0 && <div><SectionTitle>Certifications</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}<div><SectionTitle>Strengths</SectionTitle><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">{resume.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="space-y-7"><div><SectionTitle>Professional Experience</SectionTitle><div className="mt-4 space-y-5">{resume.experience.map((item) => <div key={`${item.company}-${item.period}`} className="border-l-2 border-[rgba(8,96,108,0.14)] pl-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-semibold text-[var(--color-ink)]">{item.title}</h3><p className="text-sm font-medium text-[var(--color-muted)]">{item.period}</p></div><p className="mt-1 text-sm font-medium text-[var(--color-dark)]">{[item.company, item.location].filter(Boolean).join(" | ")}</p><ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--color-ink)]">{item.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}</ul></div>)}</div></div><div><SectionTitle>Education</SectionTitle><div className="mt-3 space-y-3">{resume.education.map((item) => <div key={`${item.institution}-${item.year}`}><p className="text-base font-semibold text-[var(--color-ink)]">{item.degree || item.institution}</p><p className="text-sm text-[var(--color-muted)]">{[item.institution, item.year].filter(Boolean).join(" | ")}</p></div>)}</div></div><div><PersonalInfoPanel items={resume.personalInfo} /></div></div></section></PreviewShell>;
}
export function ResumeBuilder({ mode = "full" }: { mode?: "full" | "compact" | "modalOnly" }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [template, setTemplate] = useState<TemplateStyle>("executive");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const openBuilder = () => setIsFormOpen(true);

    window.addEventListener("open-resume-builder", openBuilder);
    return () => window.removeEventListener("open-resume-builder", openBuilder);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (isFormOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isFormOpen]);

  const handleFieldChange = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateExperience = (id: string, field: keyof ExperienceInput, value: string) => setForm((current) => ({ ...current, experiences: current.experiences.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  const updateEducation = (id: string, field: keyof EducationInput, value: string) => setForm((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  const addExperience = () => setForm((current) => ({ ...current, experiences: [...current.experiences, createExperience()] }));
  const addEducation = () => setForm((current) => ({ ...current, education: [...current.education, createEducation()] }));
  const removeExperience = (id: string) => setForm((current) => ({ ...current, experiences: current.experiences.length === 1 ? [createExperience()] : current.experiences.filter((item) => item.id !== id) }));
  const removeEducation = (id: string) => setForm((current) => ({ ...current, education: current.education.length === 1 ? [createEducation()] : current.education.filter((item) => item.id !== id) }));

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, photoDataUrl: String(reader.result || ""), photoName: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const resetBuilder = () => {
    setForm(initialForm());
    setResume(null);
    setError("");
    setTemplate("executive");
    setIsFormOpen(false);
  };

  const generateResume = async () => {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/resume-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, experiences: form.experiences.map((item) => ({ company: item.company, title: item.title, location: item.location, joinedMonth: item.joinedMonth, joinedYear: item.joinedYear, exitMonth: item.exitMonth, exitYear: item.exitYear, highlights: item.highlights })), education: form.education.map((item) => ({ institution: item.institution, degree: item.degree, year: item.year })) }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Resume generation failed.");
        setResume(payload.resume as ResumeData);
        setIsFormOpen(false);
      } catch (generationError) {
        setResume(null);
        setError(generationError instanceof Error ? generationError.message : "Resume generation failed. Please try again.");
      }
    });
  };

  const downloadPdf = () => {
    if (!resume) return;
    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildPdfMarkup(resume, template, form.photoDataUrl));
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
  };

  const downloadWord = () => {
    if (!resume) return;
    downloadBlob(
      `${resume.fullName.replace(/\s+/g, "-").toLowerCase()}-resume.doc`,
      buildWordMarkup(resume, template, form.photoDataUrl),
      "application/msword"
    );
  };

  const modalContent = isFormOpen ? (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6">
      <div className="soft-panel modal-rise no-print relative my-8 w-full max-w-5xl p-6 sm:p-8">
        <button type="button" onClick={() => setIsFormOpen(false)} className="absolute right-5 top-5 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">Close</button>
        <div className="pr-16"><p className="eyebrow">Resume Builder Form</p><h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-ink)]">Enter candidate details and generate the resume.</h2></div>
        <div className="mt-5 rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Personal Information included in resume</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Email, phone, location, address, date of birth, nationality, languages, LinkedIn, and portfolio are added automatically when you fill them here.</p>
        </div>
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-[var(--color-ink)]">Personal Information</h3>
            <p className="text-sm text-[var(--color-muted)]">This section appears in the final resume.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Full Name</span><input value={form.fullName} onChange={(event) => handleFieldChange("fullName", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Your full name" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Email</span><input value={form.email} onChange={(event) => handleFieldChange("email", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="name@example.com" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Phone</span><input value={form.phone} onChange={(event) => handleFieldChange("phone", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Phone number" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Alternative Number</span><input value={form.alternativeNumber} onChange={(event) => handleFieldChange("alternativeNumber", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Alternative number" /></label>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Location</span><input value={form.location} onChange={(event) => handleFieldChange("location", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Current city" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">LinkedIn</span><input value={form.linkedin} onChange={(event) => handleFieldChange("linkedin", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="LinkedIn URL" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Portfolio</span><input value={form.portfolio} onChange={(event) => handleFieldChange("portfolio", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Portfolio URL" /></label>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Address</span><input value={form.address} onChange={(event) => handleFieldChange("address", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Street / area" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Date of Birth</span><input value={form.dateOfBirth} onChange={(event) => handleFieldChange("dateOfBirth", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="DD/MM/YYYY" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Nationality</span><input value={form.nationality} onChange={(event) => handleFieldChange("nationality", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Nationality" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Languages</span><input value={form.languages} onChange={(event) => handleFieldChange("languages", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="English, Telugu" /></label>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Years of Experience</span><input value={form.yearsExperience} onChange={(event) => handleFieldChange("yearsExperience", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Years of experience" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Certifications</span><input value={form.certifications} onChange={(event) => handleFieldChange("certifications", event.target.value)} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="PMP, Lean Six Sigma, SAP" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Candidate Photo</span><input type="file" accept="image/*" onChange={handlePhotoUpload} className="block w-full rounded-2xl border border-[var(--color-line)] bg-white px-3 py-[11px] text-sm text-[var(--color-ink)]" /></label>
        </div>
        {form.photoName && <p className="mt-2 text-sm text-[var(--color-muted)]">Photo attached: {form.photoName}</p>}
        <div className="mt-5 space-y-5">
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Core Skills</span><textarea value={form.skills} onChange={(event) => handleFieldChange("skills", event.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="ERP, Stakeholder Management, Delivery Planning, Reporting" /></label>
          <label className="space-y-2"><span className="text-sm font-medium text-[var(--color-ink)]">Career Notes / Achievements</span><textarea value={form.professionalNotes} onChange={(event) => handleFieldChange("professionalNotes", event.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Add promotions, awards, projects, outcomes, or specific strengths to emphasize." /></label>
        </div>
        <div className="mt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-[var(--color-ink)]">Experience</h2><button type="button" onClick={addExperience} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Add Experience</button></div><div className="mt-4 space-y-4">{form.experiences.map((item, index) => <div key={item.id} className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><p className="eyebrow !tracking-[0.18em]">Experience {index + 1}</p><button type="button" onClick={() => removeExperience(item.id)} className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-accent-strong)]">Remove</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><input value={item.company} onChange={(event) => updateExperience(item.id, "company", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Company" /><input value={item.title} onChange={(event) => updateExperience(item.id, "title", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Title" /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><input value={item.location} onChange={(event) => updateExperience(item.id, "location", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Location" /><div className="grid grid-cols-2 gap-4"><input value={item.joinedMonth} onChange={(event) => updateExperience(item.id, "joinedMonth", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Joined month" /><input value={item.joinedYear} onChange={(event) => updateExperience(item.id, "joinedYear", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Joined year" /></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="grid grid-cols-2 gap-4"><input value={item.exitMonth} onChange={(event) => updateExperience(item.id, "exitMonth", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Exit month" /><input value={item.exitYear} onChange={(event) => updateExperience(item.id, "exitYear", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Exit year / Present" /></div></div><textarea value={item.highlights} onChange={(event) => updateExperience(item.id, "highlights", event.target.value)} rows={4} className="mt-4 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Write your current bullets, achievements, responsibilities, tools used, impact, team size, etc." /></div>)}</div></div>
        <div className="mt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-[var(--color-ink)]">Education</h2><button type="button" onClick={addEducation} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Add Education</button></div><div className="mt-4 space-y-4">{form.education.map((item) => <div key={item.id} className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_0.55fr_auto]"><input value={item.institution} onChange={(event) => updateEducation(item.id, "institution", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Institution" /><input value={item.degree} onChange={(event) => updateEducation(item.id, "degree", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Degree" /><input value={item.year} onChange={(event) => updateEducation(item.id, "year", event.target.value)} className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-dark)]" placeholder="Year" /><button type="button" onClick={() => removeEducation(item.id)} className="self-center text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-accent-strong)]">Remove</button></div></div>)}</div></div>
        <div className="mt-8 flex flex-wrap items-center gap-3"><button type="button" onClick={generateResume} disabled={isPending} className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Generating..." : "Generate Resume"}</button><button type="button" onClick={resetBuilder} className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Reset</button></div>
        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    </div>
  ) : null;

  const modalPortal =
    modalContent && typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;

  const launcherContent =
    typeof document !== "undefined" ? (
      <div className="motion-float fixed bottom-5 right-5 z-[60] hidden w-[260px] rounded-[1.5rem] border border-[var(--color-line)] bg-white/95 p-4 shadow-[0_24px_60px_rgba(15,47,54,0.16)] backdrop-blur-md lg:block no-print">
        <p className="eyebrow">Resume Builder</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
          Open the builder anytime from the home screen and generate a resume in a popup.
        </p>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="mt-4 w-full rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
        >
          Open Popup Builder
        </button>
      </div>
    ) : null;

  const launcherPortal =
    launcherContent && typeof document !== "undefined" ? createPortal(launcherContent, document.body) : null;

  if (mode === "modalOnly") {
    return (
      <>
        {modalPortal}
        {launcherPortal}
      </>
    );
  }

  if (mode === "compact") {
    return (
      <section className="hero-surface">
        <div className="section-shell py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Resume Builder</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              Build a polished resume with a layout that fits your profile.
            </h2>
            <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">
              Open the builder in a popup, fill in the candidate details, and keep the live resume preview on this page.
            </p>
          </div>

          <div className="mt-8 flex justify-center no-print">
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Open Resume
            </button>
          </div>

          <div className="mx-auto mt-8 max-w-5xl">
            {resume ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 no-print lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-2 sm:max-w-sm">
                    <label className="space-y-2">
                      <span className="eyebrow">Template Style</span>
                      <select
                        value={template}
                        onChange={(event) => setTemplate(event.target.value as TemplateStyle)}
                        className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                      >
                        {templateCards.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-sm leading-6 text-[var(--color-muted)]">
                      {templateCards.find((item) => item.key === template)?.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={downloadPdf} className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Download PDF</button>
                    <button type="button" onClick={downloadWord} className="rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-accent-strong)] hover:text-white">Download Word</button>
                  </div>
                </div>
                <ResumePreview resume={resume} template={template} photoDataUrl={form.photoDataUrl} />
              </div>
            ) : (
              <div className="soft-panel p-8 text-center">
                <p className="eyebrow">Live Preview</p>
                  <h3 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)] sm:text-3xl">
                    Live resume preview will appear here.
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                    Open the popup builder, complete the form, and generate the resume. The preview updates here without taking over the page.
                  </p>
              </div>
            )}
          </div>

          {modalPortal}
          {launcherPortal}
        </div>
      </section>
    );
  }

  return (
    <section className="hero-surface">
      <div className="section-shell print-shell py-14 sm:py-18">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Resume Builder</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-[var(--color-ink)]">Build a polished resume with a layout that fits your profile.</h1>
          <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">Open the builder in a popup, fill in the candidate details, and keep the live resume preview on this page.</p>
        </div>

        <div className="mt-10 flex justify-center no-print">
          <button type="button" onClick={() => setIsFormOpen(true)} className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]">Open Resume</button>
        </div>

        <div className="mt-8">
          {resume ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 no-print lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-2 sm:max-w-sm">
                  <label className="space-y-2">
                    <span className="eyebrow">Template Style</span>
                    <select
                      value={template}
                      onChange={(event) => setTemplate(event.target.value as TemplateStyle)}
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    >
                      {templateCards.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-sm leading-6 text-[var(--color-muted)]">
                    {templateCards.find((item) => item.key === template)?.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={downloadPdf} className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">Download PDF</button>
                  <button type="button" onClick={downloadWord} className="rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-accent-strong)] hover:text-white">Download Word</button>
                </div>
              </div>
              <ResumePreview resume={resume} template={template} photoDataUrl={form.photoDataUrl} />
            </div>
          ) : (
            <div className="soft-panel p-10 text-center">
              <p className="eyebrow">Live Preview</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">Live resume preview will appear here.</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">Open the popup builder, complete the form, and generate the resume. The preview updates here without taking over the page.</p>
            </div>
          )}
        </div>

        {modalPortal}
        {launcherPortal}
      </div>
    </section>
  );
}
