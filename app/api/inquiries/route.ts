import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024
export const runtime = 'nodejs'

function asString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatHtmlRows(entries: Array<[string, string]>) {
  return entries
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;font-weight:600;border:1px solid #d8d8d8;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #d8d8d8;">${escapeHtml(value)}</td></tr>`
    )
    .join('')
}

async function fileToAttachment(file: File) {
  if (!file.name || file.size === 0) {
    return null
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Attachments must be 5 MB or smaller.')
  }

  const bytes = await file.arrayBuffer()

  return {
    filename: file.name,
    content: Buffer.from(bytes).toString('base64'),
    content_type: file.type || undefined,
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const inquiryType = asString(formData.get('inquiryType'))
    const senderEmail = process.env.RESEND_FROM_EMAIL
    const senderName = process.env.RESEND_FROM_NAME || 'Werkly Website'
    const apiKey = process.env.RESEND_API_KEY
    const recipient = process.env.RESEND_TO_EMAIL

    if (!apiKey || !senderEmail || !recipient) {
      return NextResponse.json(
        {
          message:
            'Form delivery is not configured yet. Add RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_TO_EMAIL.',
        },
        { status: 500 }
      )
    }

    const fileField = inquiryType === 'company' ? formData.get('jobDescription') : formData.get('resume')
    const attachment = fileField instanceof File ? await fileToAttachment(fileField) : null
    let replyTo = ''
    let rows = ''
    let subject = ''

    if (inquiryType === 'company') {
      const fields = {
        companyName: asString(formData.get('companyName')),
        contactPerson: asString(formData.get('contactPerson')),
        companyEmail: asString(formData.get('companyEmail')),
        companyPhone: asString(formData.get('companyPhone')),
        hiringRole: asString(formData.get('hiringRole')),
        openPositions: asString(formData.get('openPositions')),
        jobLocation: asString(formData.get('jobLocation')),
        industry: asString(formData.get('industry')),
        companyMessage: asString(formData.get('companyMessage')),
      }

      if (
        !fields.companyName ||
        !fields.contactPerson ||
        !fields.companyEmail ||
        !fields.companyPhone ||
        !fields.hiringRole ||
        !fields.openPositions
      ) {
        return NextResponse.json({ message: 'Please complete all required fields.' }, { status: 400 })
      }

      rows = formatHtmlRows([
        ['Inquiry Type', 'Company Enquiry'],
        ['Company', fields.companyName],
        ['Contact Person', fields.contactPerson],
        ['Email', fields.companyEmail],
        ['Phone', fields.companyPhone],
        ['Position', fields.hiringRole],
        ['Open Positions', fields.openPositions],
        ['Job Location', fields.jobLocation],
        ['Industry', fields.industry],
        ['Requirement Details', fields.companyMessage],
      ])
      subject = `Website company enquiry: ${fields.companyName} - ${fields.hiringRole}`
      replyTo = fields.companyEmail
    } else {
      const fields = {
        candidateName: asString(formData.get('candidateName')),
        candidateEmail: asString(formData.get('candidateEmail')),
        candidatePhone: asString(formData.get('candidatePhone')),
        experience: asString(formData.get('experience')),
        currentCompany: asString(formData.get('currentCompany')),
        currentLocation: asString(formData.get('currentLocation')),
        currentDesignation: asString(formData.get('currentDesignation')),
        preferredRole: asString(formData.get('preferredRole')),
        preferredLocation: asString(formData.get('preferredLocation')),
        preferredSector: asString(formData.get('preferredSector')),
        candidateMessage: asString(formData.get('candidateMessage')),
      }

      if (!fields.candidateName || !fields.candidateEmail || !fields.candidatePhone || !fields.preferredRole) {
        return NextResponse.json({ message: 'Please complete all required fields.' }, { status: 400 })
      }

      rows = formatHtmlRows([
        ['Inquiry Type', 'Candidate Enquiry'],
        ['Name', fields.candidateName],
        ['Email', fields.candidateEmail],
        ['Phone', fields.candidatePhone],
        ['Experience', fields.experience],
        ['Current Company', fields.currentCompany],
        ['Current Location', fields.currentLocation],
        ['Current Designation', fields.currentDesignation],
        ['Preferred Role', fields.preferredRole],
        ['Preferred Location', fields.preferredLocation],
        ['Preferred Sector', fields.preferredSector],
        ['Details', fields.candidateMessage],
      ])
      subject = `Website candidate enquiry: ${fields.candidateName} - ${fields.preferredRole}`
      replyTo = fields.candidateEmail
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [recipient],
        reply_to: replyTo,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;color:#22392f;">
            <h2 style="margin:0 0 16px;">${escapeHtml(subject)}</h2>
            <table style="border-collapse:collapse;width:100%;max-width:720px;">${rows}</table>
          </div>
        `,
        attachments: attachment ? [attachment] : undefined,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend submission failed:', errorText)
      return NextResponse.json(
        { message: 'Email delivery failed. Check Resend configuration and sender verification.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      message: inquiryType === 'company' ? 'Company enquiry submitted successfully.' : 'Job preference submitted successfully.',
    })
  } catch (error) {
    console.error('Inquiry submission failed:', error)

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Submission failed.',
      },
      { status: 500 }
    )
  }
}
