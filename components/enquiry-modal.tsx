'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { InquiryForm } from '@/components/inquiry-forms'

export function EnquiryModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'candidate' | 'company'>('candidate')

  useEffect(() => {
    if (window.location.hash === '#candidate-form') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveTab('candidate')
          setIsOpen(true)
        }}
        className="inline-flex items-center justify-center rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-dark)] transition hover:opacity-95"
      >
        Enquiry
      </button>

      {typeof document !== 'undefined' && isOpen
        ? createPortal(
        <div className="fixed inset-0 z-[80] bg-[rgba(5,7,11,0.62)]">
          <div className="h-full overflow-y-auto px-4 py-6 sm:py-10">
            <div className="mx-auto w-full max-w-3xl pt-12">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-2xl leading-none text-slate-900 shadow-sm transition hover:bg-slate-50"
                  aria-label="Close enquiry form"
                >
                  x
                </button>
                <div className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[1.6rem]">
                  <div className="story-card rounded-b-none border-b-0 px-8 pb-0 pt-8 sm:px-9">
                    <div className="inline-flex rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]/85 p-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('candidate')}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          activeTab === 'candidate'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Candidate Enquiry
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('company')}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          activeTab === 'company'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Company Enquiry
                      </button>
                    </div>
                  </div>
                  <InquiryForm
                    kind={activeTab}
                    className="rounded-t-none border-t-0 shadow-[0_30px_70px_rgba(10,22,42,0.18)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  )
}
