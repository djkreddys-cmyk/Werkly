'use client'

import { useState } from 'react'

type InquiryKind = 'candidate' | 'company'

type InquiryFormProps = {
  id?: string
  kind: InquiryKind
  className?: string
}

type FormState = {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message: string
}

const fieldClassName =
  'w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-dark)] focus:ring-2 focus:ring-[rgba(23,56,47,0.12)]'

const initialState: FormState = {
  status: 'idle',
  message: '',
}

export function InquiryForm({ id, kind, className = '' }: InquiryFormProps) {
  const [state, setState] = useState<FormState>(initialState)
  const isCompany = kind === 'company'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('inquiryType', kind)

    setState({
      status: 'submitting',
      message: 'Submitting your enquiry...',
    })

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(result.message || 'Submission failed.')
      }

      form.reset()
      setState({
        status: 'success',
        message: result.message || 'Your enquiry has been submitted.',
      })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Submission failed.',
      })
    }
  }

  return (
    <article id={id} className={`story-card p-8 sm:p-9 ${id ? 'anchor-section' : ''} ${className}`.trim()}>
      <p className="eyebrow">{isCompany ? 'Company Enquiry' : 'Candidate Enquiry'}</p>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-slate-950 sm:text-4xl">
        {isCompany
          ? 'Share your hiring requirement and job description in one short form.'
          : 'Share your preferred role and resume in one short form.'}
      </h2>

      <form className="mt-8 space-y-4" encType="multipart/form-data" onSubmit={handleSubmit}>
        {isCompany ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="companyName" placeholder="Company name" required />
              <input className={fieldClassName} type="text" name="contactPerson" placeholder="Contact person" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="email" name="companyEmail" placeholder="Work email" required />
              <input className={fieldClassName} type="tel" name="companyPhone" placeholder="Phone number" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="hiringRole" placeholder="Position / role title" required />
              <input className={fieldClassName} type="number" min="1" name="openPositions" placeholder="Number of positions" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="jobLocation" placeholder="Job location" />
              <input className={fieldClassName} type="text" name="industry" placeholder="Industry / sector" />
            </div>
            <textarea
              className={`${fieldClassName} min-h-[120px] resize-y`}
              name="companyMessage"
              placeholder="Add hiring timeline, experience range, budget, or any requirement details."
            />
            <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper)]/65 p-4">
              <label className="block text-sm font-semibold text-slate-950" htmlFor="company-jd">
                Job description attachment
              </label>
              <p className="mt-1 text-sm leading-6 muted-copy">
                Upload the JD in PDF, DOC, or DOCX format. Max size 5 MB.
              </p>
              <input
                id="company-jd"
                className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:font-semibold file:text-[var(--color-dark)]"
                type="file"
                name="jobDescription"
                accept=".pdf,.doc,.docx"
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="candidateName" placeholder="Full name" required />
              <input className={fieldClassName} type="email" name="candidateEmail" placeholder="Email address" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="tel" name="candidatePhone" placeholder="Phone number" required />
              <input className={fieldClassName} type="text" name="experience" placeholder="Experience (e.g. 4 years)" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="currentCompany" placeholder="Current company name" />
              <input className={fieldClassName} type="text" name="currentLocation" placeholder="Current location" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="currentDesignation" placeholder="Current designation" />
              <input className={fieldClassName} type="text" name="preferredRole" placeholder="Preferred role" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={fieldClassName} type="text" name="preferredLocation" placeholder="Preferred location" />
              <input
                className={fieldClassName}
                type="text"
                name="preferredSector"
                placeholder="Preferred sector (Pharma, Engineering, Food, etc.)"
              />
            </div>
            <textarea
              className={`${fieldClassName} min-h-[120px] resize-y`}
              name="candidateMessage"
              placeholder="Add notice period, current company, expected CTC, or anything relevant for job matching."
            />
            <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper)]/65 p-4">
              <label className="block text-sm font-semibold text-slate-950" htmlFor="candidate-resume">
                Resume attachment
              </label>
              <p className="mt-1 text-sm leading-6 muted-copy">
                Upload your latest resume in PDF, DOC, or DOCX format. Max size 5 MB.
              </p>
              <input
                id="candidate-resume"
                className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:font-semibold file:text-[var(--color-dark)]"
                type="file"
                name="resume"
                accept=".pdf,.doc,.docx"
                required
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-sm leading-6 ${
              state.status === 'success'
                ? 'text-emerald-700'
                : state.status === 'error'
                  ? 'text-red-700'
                  : 'muted-copy'
            }`}
            aria-live="polite"
          >
            {state.message ||
              (isCompany
                ? 'Job description attachment is required for company enquiries.'
                : 'Resume attachment is required for candidate submissions.')}
          </p>
          <button
            type="submit"
            disabled={state.status === 'submitting'}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.status === 'submitting'
              ? 'Submitting...'
              : isCompany
                ? 'Submit Company Enquiry'
                : 'Submit Job Preference'}
          </button>
        </div>
      </form>
    </article>
  )
}
