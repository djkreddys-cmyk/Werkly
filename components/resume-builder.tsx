'use client'

import { useMemo, useState } from 'react'

type ExperienceInput = {
  company: string
  title: string
  location: string
  start: string
  end: string
  highlights: string
}

type EducationInput = {
  institution: string
  degree: string
  year: string
}

type ResumeFormState = {
  fullName: string
  email: string
  phone: string
  location: string
  linkedin: string
  portfolio: string
  targetRole: string
  yearsExperience: string
  professionalNotes: string
  skills: string
  certifications: string
  experiences: ExperienceInput[]
  education: EducationInput[]
}

type GeneratedExperience = {
  company: string
  title: string
  location: string
  period: string
  bullets: string[]
}

type GeneratedEducation = {
  institution: string
  degree: string
  year: string
  details?: string
}

type GeneratedResume = {
  fullName: string
  targetRole: string
  contactLine: string
  headline: string
  summary: string
  coreSkills: string[]
  strengths: string[]
  experience: GeneratedExperience[]
  education: GeneratedEducation[]
  certifications: string[]
}

const emptyExperience = (): ExperienceInput => ({
  company: '',
  title: '',
  location: '',
  start: '',
  end: '',
  highlights: '',
})

const emptyEducation = (): EducationInput => ({
  institution: '',
  degree: '',
  year: '',
})

const initialState: ResumeFormState = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  portfolio: '',
  targetRole: '',
  yearsExperience: '',
  professionalNotes: '',
  skills: '',
  certifications: '',
  experiences: [emptyExperience()],
  education: [emptyEducation()],
}

export function ResumeBuilder() {
  const [form, setForm] = useState<ResumeFormState>(initialState)
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const canGenerate = useMemo(() => {
    return Boolean(
      form.fullName.trim() &&
        form.email.trim() &&
        form.targetRole.trim() &&
        form.yearsExperience.trim() &&
        form.skills.trim()
    )
  }, [form])

  const updateField = (field: keyof ResumeFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateExperience = (index: number, field: keyof ExperienceInput, value: string) => {
    setForm((current) => ({
      ...current,
      experiences: current.experiences.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const updateEducation = (index: number, field: keyof EducationInput, value: string) => {
    setForm((current) => ({
      ...current,
      education: current.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addExperience = () => {
    setForm((current) => ({ ...current, experiences: [...current.experiences, emptyExperience()] }))
  }

  const removeExperience = (index: number) => {
    setForm((current) => ({
      ...current,
      experiences:
        current.experiences.length === 1
          ? [emptyExperience()]
          : current.experiences.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const addEducation = () => {
    setForm((current) => ({ ...current, education: [...current.education, emptyEducation()] }))
  }

  const removeEducation = (index: number) => {
    setForm((current) => ({
      ...current,
      education:
        current.education.length === 1
          ? [emptyEducation()]
          : current.education.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleGenerate = async () => {
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/resume-builder', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Resume generation failed.')
      }

      setGeneratedResume(data.resume as GeneratedResume)
      setStatus('success')
      setMessage('AI resume generated successfully.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Resume generation failed.')
    }
  }

  const handleReset = () => {
    setForm(initialState)
    setGeneratedResume(null)
    setStatus('idle')
    setMessage('')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="section-shell print-shell py-10 sm:py-12">
      <div className="no-print mb-8 max-w-3xl">
        <p className="eyebrow">AI Resume Builder</p>
        <h1 className="mt-4 section-title">
          Build a polished resume with AI and export it as PDF.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
          Add your career details once, generate stronger summaries and experience bullets, then export a styled resume ready for applications.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="no-print accent-card p-6 sm:p-8">
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Full Name</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Target Role</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.targetRole} onChange={(event) => updateField('targetRole', event.target.value)} />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Phone</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Location</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.location} onChange={(event) => updateField('location', event.target.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">LinkedIn</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.linkedin} onChange={(event) => updateField('linkedin', event.target.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Portfolio</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.portfolio} onChange={(event) => updateField('portfolio', event.target.value)} />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Years of Experience</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" value={form.yearsExperience} onChange={(event) => updateField('yearsExperience', event.target.value)} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Certifications</span>
                <input className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" placeholder="PMP, Lean Six Sigma, SAP..." value={form.certifications} onChange={(event) => updateField('certifications', event.target.value)} />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Core Skills</span>
              <textarea className="min-h-[110px] rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" placeholder="Hiring strategy, stakeholder management, SAP ERP, vendor management..." value={form.skills} onChange={(event) => updateField('skills', event.target.value)} />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Career Notes / Achievements</span>
              <textarea className="min-h-[120px] rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none" placeholder="Add promotions, awards, projects, outcomes, or any specific strengths you want the AI to emphasize." value={form.professionalNotes} onChange={(event) => updateField('professionalNotes', event.target.value)} />
            </label>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">Experience</h2>
                <button type="button" onClick={addExperience} className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)]">
                  Add Experience
                </button>
              </div>
              {form.experiences.map((experience, index) => (
                <div key={`${experience.company}-${index}`} className="rounded-2xl border border-[var(--color-line)] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
                      Experience {index + 1}
                    </p>
                    <button type="button" onClick={() => removeExperience(index)} className="text-sm text-slate-500">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Company" value={experience.company} onChange={(event) => updateExperience(index, 'company', event.target.value)} />
                    <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Title" value={experience.title} onChange={(event) => updateExperience(index, 'title', event.target.value)} />
                    <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Location" value={experience.location} onChange={(event) => updateExperience(index, 'location', event.target.value)} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Start" value={experience.start} onChange={(event) => updateExperience(index, 'start', event.target.value)} />
                      <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="End / Present" value={experience.end} onChange={(event) => updateExperience(index, 'end', event.target.value)} />
                    </div>
                  </div>
                  <textarea className="mt-4 min-h-[110px] w-full rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Write your current bullets, achievements, responsibilities, tools used, impact, team size, etc." value={experience.highlights} onChange={(event) => updateExperience(index, 'highlights', event.target.value)} />
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">Education</h2>
                <button type="button" onClick={addEducation} className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)]">
                  Add Education
                </button>
              </div>
              {form.education.map((item, index) => (
                <div key={`${item.institution}-${index}`} className="grid gap-4 rounded-2xl border border-[var(--color-line)] bg-white p-4 sm:grid-cols-[1.2fr_1fr_120px_auto] sm:items-center">
                  <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Institution" value={item.institution} onChange={(event) => updateEducation(index, 'institution', event.target.value)} />
                  <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Degree" value={item.degree} onChange={(event) => updateEducation(index, 'degree', event.target.value)} />
                  <input className="rounded-xl border border-[var(--color-line)] px-4 py-3 outline-none" placeholder="Year" value={item.year} onChange={(event) => updateEducation(index, 'year', event.target.value)} />
                  <button type="button" onClick={() => removeEducation(index)} className="text-sm text-slate-500">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || status === 'loading'}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--color-dark)] px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? 'Generating Resume...' : 'Generate with AI'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--color-line)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Reset
              </button>
              {generatedResume ? (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-dark)]"
                >
                  Download PDF
                </button>
              ) : null}
            </div>

            {message ? (
              <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{message}</p>
            ) : (
              <p className="text-sm muted-copy">
                Add the most relevant career details first. The AI will rewrite and structure them into a cleaner resume.
              </p>
            )}
          </div>
        </section>

        <section className="print-preview accent-card p-7 sm:p-10">
          {generatedResume ? (
            <div className="space-y-8">
              <div className="border-b border-[var(--color-line)] pb-6">
                <h2 className="font-[family-name:var(--font-display)] text-4xl text-slate-950">
                  {generatedResume.fullName}
                </h2>
                <p className="mt-2 text-lg font-semibold text-[var(--color-brand-cyan)]">
                  {generatedResume.targetRole}
                </p>
                <p className="mt-3 text-sm leading-6 muted-copy">{generatedResume.contactLine}</p>
                <p className="mt-4 text-sm uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                  {generatedResume.headline}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                  Professional Summary
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {generatedResume.summary}
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                      Core Skills
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {generatedResume.coreSkills.map((skill) => (
                        <span key={skill} className="rounded-full bg-[var(--color-dark)]/8 px-3 py-1 text-sm font-medium text-[var(--color-ink)]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {generatedResume.certifications.length ? (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                        Certifications
                      </h3>
                      <ul className="mt-4 space-y-2">
                        {generatedResume.certifications.map((item) => (
                          <li key={item} className="text-sm leading-6 text-slate-700">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {generatedResume.education.length ? (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                        Education
                      </h3>
                      <div className="mt-4 space-y-4">
                        {generatedResume.education.map((item) => (
                          <div key={`${item.institution}-${item.degree}`}>
                            <p className="font-semibold text-slate-900">{item.degree}</p>
                            <p className="text-sm leading-6 text-slate-700">
                              {item.institution} {item.year ? `| ${item.year}` : ''}
                            </p>
                            {item.details ? (
                              <p className="text-sm leading-6 text-slate-600">{item.details}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                      Professional Experience
                    </h3>
                    <div className="mt-4 space-y-6">
                      {generatedResume.experience.map((item) => (
                        <div key={`${item.company}-${item.title}`} className="border-l-2 border-[var(--color-brand-cyan)]/22 pl-5">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                            <h4 className="text-lg font-semibold text-slate-950">
                              {item.title}
                            </h4>
                            <p className="text-sm text-slate-500">{item.period}</p>
                          </div>
                          <p className="mt-1 text-sm font-medium text-[var(--color-brand-cyan)]">
                            {item.company}{item.location ? ` | ${item.location}` : ''}
                          </p>
                          <ul className="mt-3 space-y-2">
                            {item.bullets.map((bullet) => (
                              <li key={bullet} className="flex gap-3 text-sm leading-6 text-slate-700">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-strong)]" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {generatedResume.strengths.length ? (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                        Career Highlights
                      </h3>
                      <ul className="mt-4 space-y-2">
                        {generatedResume.strengths.map((item) => (
                          <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-cyan)]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[720px] flex-col items-center justify-center text-center">
              <p className="eyebrow">Resume Preview</p>
              <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950">
                Your AI-generated resume will appear here.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 muted-copy">
                Complete the form, generate your resume, then review it here before downloading it as PDF.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
