import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ResumeRequest = {
  fullName?: string
  email?: string
  phone?: string
  alternativeNumber?: string
  location?: string
  address?: string
  dateOfBirth?: string
  nationality?: string
  languages?: string
  linkedin?: string
  portfolio?: string
  yearsExperience?: string
  professionalNotes?: string
  skills?: string
  certifications?: string
  experiences?: Array<{
    company?: string
    title?: string
    location?: string
    joinedMonth?: string
    joinedYear?: string
    exitMonth?: string
    exitYear?: string
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
  personalInfo: Array<{
    label: string
    value: string
  }>
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

function compactSentence(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanLead(value: string) {
  const firstLine = value.split(/\r?\n|[.!?]/)[0] || ''
  const normalized = compactSentence(firstLine).replace(/^[*-]\s*/, '')
  if (!normalized) return ''
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function splitCommaValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatYearsExperience(value: string) {
  const normalized = clean(value)
  if (!normalized) return ''
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const amount = Number(normalized)
    return `${normalized} ${amount === 1 ? 'year' : 'years'}`
  }
  return /year/i.test(normalized) ? normalized : `${normalized} years`
}

const monthLookup: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseMonth(value: string) {
  const normalized = clean(value).toLowerCase()
  if (!normalized) return null
  if (/^\d{1,2}$/.test(normalized)) {
    const month = Number(normalized) - 1
    return month >= 0 && month <= 11 ? month : null
  }
  return normalized in monthLookup ? monthLookup[normalized] : null
}

function parseYear(value: string) {
  const normalized = clean(value)
  if (!/^\d{4}$/.test(normalized)) return null
  return Number(normalized)
}

function buildPeriod(input: {
  joinedMonth: string
  joinedYear: string
  exitMonth: string
  exitYear: string
}) {
  const startMonth = parseMonth(input.joinedMonth)
  const startYear = parseYear(input.joinedYear)
  const endMonth = parseMonth(input.exitMonth)
  const endYear = parseYear(input.exitYear)
  const isPresent = /^present$/i.test(clean(input.exitYear)) || (!input.exitMonth && !input.exitYear)

  const startLabel =
    startMonth !== null && startYear !== null ? `${monthNames[startMonth]} ${startYear}` : clean([input.joinedMonth, input.joinedYear].filter(Boolean).join(' '))
  const endLabel =
    isPresent ? 'Present' : endMonth !== null && endYear !== null ? `${monthNames[endMonth]} ${endYear}` : clean([input.exitMonth, input.exitYear].filter(Boolean).join(' '))

  let duration = ''
  if (startMonth !== null && startYear !== null) {
    const effectiveEndMonth = isPresent ? new Date().getMonth() : endMonth
    const effectiveEndYear = isPresent ? new Date().getFullYear() : endYear
    if (effectiveEndMonth !== null && effectiveEndYear !== null) {
      const totalMonths = (effectiveEndYear - startYear) * 12 + (effectiveEndMonth - startMonth)
      if (totalMonths >= 0) {
        const years = Math.floor(totalMonths / 12)
        const months = totalMonths % 12
        const parts = []
        if (years) parts.push(`${years} yr${years === 1 ? '' : 's'}`)
        if (months) parts.push(`${months} mo${months === 1 ? '' : 's'}`)
        if (parts.length) duration = ` (${parts.join(' ')})`
      }
    }
  }

  return [startLabel, endLabel].filter(Boolean).join(' - ') + duration || 'Previous Role'
}

function buildContactLine(input: {
  email: string
  phone: string
  alternativeNumber: string
  location: string
  linkedin: string
  portfolio: string
}) {
  return [input.email, input.phone, input.alternativeNumber, input.location, input.linkedin, input.portfolio]
    .filter(Boolean)
    .join(' | ')
}

function buildHeadline(targetRole: string, yearsExperience: string) {
  return `${targetRole} with ${yearsExperience} of experience in structured delivery and business support`
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
      ? `Most recently worked with ${input.experiences[0].company || 'business teams'} in a ${input.experiences[0].title || input.targetRole} role.`
      : ''

  const noteLine = input.notes ? `${cleanLead(input.notes)}.` : ''

  return [
    `${input.targetRole} with ${input.yearsExperience} of experience in operational delivery, stakeholder alignment, and execution quality.`,
    leadingSkills
      ? `Strong working knowledge across ${leadingSkills}.`
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
      ? `${cleanLead(normalized).replace(/[.!?]+$/, '')}.`
      : `Handled ${compactSentence(normalized).toLowerCase()} in support of ${title || 'business priorities'}.`
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
    `Well suited to ${targetRole} mandates that require ownership, responsiveness, and execution discipline.`,
    skills[0] ? `Hands-on capability across ${skills.slice(0, 3).join(', ')}.` : '',
    notes ? `${cleanLead(notes)}.` : '',
    `Comfortable working with hiring stakeholders, shifting priorities, and structured delivery expectations.`,
  ].filter(Boolean)

  return strengths.slice(0, 4)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResumeRequest

    const fullName = clean(body.fullName)
    const email = clean(body.email)
    const yearsExperience = formatYearsExperience(clean(body.yearsExperience))
    const skillsRaw = clean(body.skills)
    const experienceEntries = (body.experiences || [])
      .map((item) => ({
        company: clean(item.company),
        title: clean(item.title),
        location: clean(item.location),
        joinedMonth: clean(item.joinedMonth),
        joinedYear: clean(item.joinedYear),
        exitMonth: clean(item.exitMonth),
        exitYear: clean(item.exitYear),
        highlights: clean(item.highlights),
      }))
      .filter((item) => item.company || item.title || item.highlights)
    const targetRole = experienceEntries.find((item) => item.title)?.title || 'Professional Resume'

    if (!fullName || !email || !yearsExperience || !skillsRaw) {
      return NextResponse.json(
        { message: 'Please complete the required fields before generating your resume.' },
        { status: 400 }
      )
    }

    const phone = clean(body.phone)
    const alternativeNumber = clean(body.alternativeNumber)
    const location = clean(body.location)
    const address = clean(body.address)
    const dateOfBirth = clean(body.dateOfBirth)
    const nationality = clean(body.nationality)
    const languages = clean(body.languages)
    const linkedin = clean(body.linkedin)
    const portfolio = clean(body.portfolio)
    const professionalNotes = clean(body.professionalNotes)
    const certifications = splitCommaValues(clean(body.certifications))
    const skills = splitCommaValues(skillsRaw)

    const experiences = experienceEntries

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
      contactLine: buildContactLine({ email, phone, alternativeNumber, location, linkedin, portfolio }),
      personalInfo: [
        { label: 'Email', value: email },
        { label: 'Phone', value: phone },
        { label: 'Alternative Number', value: alternativeNumber },
        { label: 'Location', value: location },
        { label: 'Address', value: address },
        { label: 'Date of Birth', value: dateOfBirth },
        { label: 'Nationality', value: nationality },
        { label: 'Languages', value: languages },
        { label: 'LinkedIn', value: linkedin },
        { label: 'Portfolio', value: portfolio },
      ].filter((item) => item.value),
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
              period: buildPeriod({
                joinedMonth: item.joinedMonth,
                joinedYear: item.joinedYear,
                exitMonth: item.exitMonth,
                exitYear: item.exitYear,
              }),
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
