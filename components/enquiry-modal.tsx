'use client'

import { useEffect, useState } from 'react'
import { InquiryForm } from '@/components/inquiry-forms'

export function EnquiryModal() {
  const [isOpen, setIsOpen] = useState(false)

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
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-dark)] transition hover:opacity-95"
      >
        Enquiry
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] bg-[rgba(5,7,11,0.62)]">
          <div className="h-full overflow-y-auto px-4 py-6 sm:py-10">
            <div className="mx-auto w-full max-w-3xl">
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
                  <InquiryForm kind="candidate" className="shadow-[0_30px_70px_rgba(10,22,42,0.18)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
