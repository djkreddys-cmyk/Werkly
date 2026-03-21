import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ResumeRequest = {
  fullName?: string
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  portfolio?: string
  targetRole?: string
  yearsExperience?: string
  professionalNotes?: string
  skills?: string
  certifications?: string
  experiences?: Array<{
    company?: string
    title?: string
    location?: string
    start?: string
    end?: string
    highlights?: string
  }>
  education?: Array<{
    institution?: string
    degree?: string
    year?: string
  }>
}

type ResumePayload = {
  fullName: string
  targetRole: string
  contactLine: string
  headline: string
  summary: string
  coreSkills: string[]
  strengths: string[]
  experience: Array<{
    company: string
    title: string
    location: string
    period: string
    bullets: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    year: string
    details?: string
  }>
  certifications: string[]
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function splitCommaValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toSentenceCase(value: string) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildContactLine(input: {
  email: string
  phone: string
  location: string
  linkedin: string
  portfolio: string
}) {
  return [input.email, input.phone, input.location, input.linkedin, input.portfolio]
    .filter(Boolean)
    .join(' | ')
}

function buildHeadline(targetRole: string, yearsExperience: string) {
  return `${targetRole} | ${yearsExperience} of experience in structured delivery, stakeholder coordination, and role-specific execution`
}

function buildSummary(input: {
  targetRole: string
  yearsExperience: string
  skills: string[]
  notes: string
  experiences: Array<{ company: string; title: string }>
}) {
  const leadingSkills = input.skills.slice(0, 4).join(', ')
  const latestExperience =
    input.experiences.length > 0
      ? `Most recently aligned with ${input.experiences[0].company || 'business teams'} in a ${input.experiences[0].title || input.targetRole} capacity.`
      : ''

  const noteLine = input.notes
    ? `${toSentenceCase(input.notes.split(/[.!?]/)[0] || '')}.`
    : ''

  return [
    `${input.targetRole} with ${input.yearsExperience} focused on operational delivery, business alignment, and execution quality.`,
    leadingSkills
      ? `Brings practical strength across ${leadingSkills}.`
      : 'Brings practical strength across delivery planning, stakeholder management, and execution discipline.',
    latestExperience,
    noteLine,
  ]
    .filter(Boolean)
    .join(' ')
}

function expandExperienceBullets(highlights: string, title: string, skills: string[]) {
  const baseLines = highlights
    .split(/\r?\n|[.;]/)
    .map((line) => line.trim())
    .filter(Boolean)

  const transformed = baseLines.slice(0, 4).map((line) => {
    const normalized = line.replace(/^[*-]\s*/, '')
    return normalized.match(/managed|led|handled|developed|implemented|coordinated|delivered|supported|improved|optimized/i)
      ? toSentenceCase(normalized)
      : `Delivered ${normalized.toLowerCase()} in support of ${title || 'business priorities'}.`
  })

  if (transformed.length >= 3) {
    return transformed
  }

  const fallback = [
    `Executed role priorities with clear coordination across stakeholders, timelines, and business expectations.`,
    `Supported delivery quality through structured follow-ups, practical problem solving, and consistent communication.`,
    skills[0]
      ? `Applied ${skills[0].toLowerCase()} and related functional strengths to improve execution reliability and output quality.`
      : `Applied domain knowledge and process discipline to maintain dependable execution standards.`,
  ]

  return [...transformed, ...fallback].slice(0, 4)
}

function buildStrengths(notes: string, skills: string[], targetRole: string) {
  const strengths = [
    `Strong fit for ${targetRole} mandates that require ownership, responsiveness, and execution discipline.`,
    skills[0] ? `Hands-on capability across ${skills.slice(0, 3).join(', ')}.` : '',
    notes ? toSentenceCase(notes.split(/[.!?]/)[0] || '') : '',
    `Comfortable working with hiring stakeholders, shifting priorities, and structured delivery expectations.`,
  ].filter(Boolean)

  return strengths.slice(0, 4)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResumeRequest

    const fullName = clean(body.fullName)
    const email = clean(body.email)
    const targetRole = clean(body.targetRole)
    const yearsExperience = clean(body.yearsExperience)
    const skillsRaw = clean(body.skills)

    if (!fullName || !email || !targetRole || !yearsExperience || !skillsRaw) {
      return NextResponse.json(
        { message: 'Please complete the required fields before generating your resume.' },
        { status: 400 }
      )
    }

    const phone = clean(body.phone)
    const location = clean(body.location)
    const linkedin = clean(body.linkedin)
    const portfolio = clean(body.portfolio)
    const professionalNotes = clean(body.professionalNotes)
    const certifications = splitCommaValues(clean(body.certifications))
    const skills = splitCommaValues(skillsRaw)

    const experiences = (body.experiences || [])
      .map((item) => ({
        company: clean(item.company),
        title: clean(item.title),
        location: clean(item.location),
        start: clean(item.start),
        end: clean(item.end),
        highlights: clean(item.highlights),
      }))
      .filter((item) => item.company || item.title || item.highlights)

    const education = (body.education || [])
      .map((item) => ({
        institution: clean(item.institution),
        degree: clean(item.degree),
        year: clean(item.year),
      }))
      .filter((item) => item.institution || item.degree)

    const resume: ResumePayload = {
      fullName,
      targetRole,
      contactLine: buildContactLine({ email, phone, location, linkedin, portfolio }),
      headline: buildHeadline(targetRole, yearsExperience),
      summary: buildSummary({
        targetRole,
        yearsExperience,
        skills,
        notes: professionalNotes,
        experiences,
      }),
      coreSkills: skills.slice(0, 10),
      strengths: buildStrengths(professionalNotes, skills, targetRole),
      experience:
        experiences.length > 0
          ? experiences.map((item) => ({
              company: item.company || 'Professional Experience',
              title: item.title || targetRole,
              location: item.location,
              period: [item.start, item.end].filter(Boolean).join(' - ') || 'Previous Role',
              bullets: expandExperienceBullets(item.highlights, item.title || targetRole, skills),
            }))
          : [
              {
                company: 'Professional Background',
                title: targetRole,
                location,
                period: `${yearsExperience} of experience`,
                bullets: [
                  `Built practical experience across ${skills.slice(0, 3).join(', ') || 'business delivery and execution support'}.`,
                  `Supported structured execution, stakeholder coordination, and quality-focused delivery across role responsibilities.`,
                  `Demonstrated readiness for ${targetRole} opportunities requiring dependable follow-through and functional ownership.`,
                ],
              },
            ],
      education: education.map((item) => ({
        institution: item.institution,
        degree: item.degree,
        year: item.year,
        details: item.degree && item.institution ? `${item.degree} from ${item.institution}` : undefined,
      })),
      certifications,
    }

    return NextResponse.json({ resume })
  } catch (error) {
    console.error('Resume builder failed:', error)

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Resume generation failed.',
      },
      { status: 500 }
    )
  }
}
