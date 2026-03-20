import { NextResponse } from 'next/server'

type InquiryType = 'hiring' | 'candidate'

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
    name: file.name,
    content: Buffer.from(bytes).toString('base64'),
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const inquiryType = asString(formData.get('inquiryType')) as InquiryType

    if (inquiryType !== 'hiring' && inquiryType !== 'candidate') {
      return NextResponse.json({ message: 'Invalid enquiry type.' }, { status: 400 })
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME || 'Werkly Website'
    const apiKey = process.env.BREVO_API_KEY
    const defaultRecipient = process.env.BREVO_TO_EMAIL
    const recipient =
      inquiryType === 'hiring'
        ? process.env.BREVO_HIRING_TO_EMAIL || defaultRecipient
        : process.env.BREVO_CANDIDATE_TO_EMAIL || defaultRecipient

    if (!apiKey || !senderEmail || !recipient) {
      return NextResponse.json(
        {
          message:
            'Form delivery is not configured yet. Add BREVO_API_KEY, BREVO_SENDER_EMAIL, and recipient email env vars.',
        },
        { status: 500 }
      )
    }

    const fileField = inquiryType === 'hiring' ? formData.get('attachment') : formData.get('resume')
    const attachment = fileField instanceof File ? await fileToAttachment(fileField) : null
    let replyTo: { email: string; name: string }
    let rows = ''
    let subject = ''

    if (inquiryType === 'hiring') {
      const fields = {
        name: asString(formData.get('name')),
        company: asString(formData.get('company')),
        email: asString(formData.get('email')),
        phone: asString(formData.get('phone')),
        role: asString(formData.get('role')),
        industry: asString(formData.get('industry')),
        message: asString(formData.get('message')),
      }

      if (!fields.name || !fields.company || !fields.email || !fields.phone || !fields.role || !fields.message) {
        return NextResponse.json({ message: 'Please complete all required fields.' }, { status: 400 })
      }

      replyTo = { email: fields.email, name: fields.name }
      rows = formatHtmlRows([
        ['Inquiry Type', 'Hiring Request'],
        ['Name', fields.name],
        ['Company', fields.company],
        ['Email', fields.email],
        ['Phone', fields.phone],
        ['Role', fields.role],
        ['Industry', fields.industry],
        ['Message', fields.message],
      ])
      subject = `Website hiring request: ${fields.company} - ${fields.role}`
    } else {
      const fields = {
        candidateName: asString(formData.get('candidateName')),
        candidateEmail: asString(formData.get('candidateEmail')),
        candidatePhone: asString(formData.get('candidatePhone')),
        experience: asString(formData.get('experience')),
        preferredRole: asString(formData.get('preferredRole')),
        preferredLocation: asString(formData.get('preferredLocation')),
        preferredSector: asString(formData.get('preferredSector')),
        candidateMessage: asString(formData.get('candidateMessage')),
      }

      if (!fields.candidateName || !fields.candidateEmail || !fields.candidatePhone || !fields.preferredRole) {
        return NextResponse.json({ message: 'Please complete all required fields.' }, { status: 400 })
      }

      replyTo = { email: fields.candidateEmail, name: fields.candidateName }
      rows = formatHtmlRows([
        ['Inquiry Type', 'Candidate Enquiry'],
        ['Name', fields.candidateName],
        ['Email', fields.candidateEmail],
        ['Phone', fields.candidatePhone],
        ['Experience', fields.experience],
        ['Preferred Role', fields.preferredRole],
        ['Preferred Location', fields.preferredLocation],
        ['Preferred Sector', fields.preferredSector],
        ['Details', fields.candidateMessage],
      ])
      subject = `Website candidate enquiry: ${fields.candidateName} - ${fields.preferredRole}`
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName,
        },
        to: [{ email: recipient }],
        replyTo,
        subject,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;color:#22392f;">
            <h2 style="margin:0 0 16px;">${escapeHtml(subject)}</h2>
            <table style="border-collapse:collapse;width:100%;max-width:720px;">${rows}</table>
          </div>
        `,
        attachment: attachment ? [attachment] : undefined,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Brevo submission failed:', errorText)
      return NextResponse.json(
        { message: 'Email delivery failed. Check Brevo configuration and recipient settings.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      message:
        inquiryType === 'hiring'
          ? 'Hiring request submitted successfully.'
          : 'Job preference submitted successfully.',
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
