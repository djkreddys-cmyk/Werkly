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

type OpenAIContentItem = {
  text?: string
  output_text?: string
}

type OpenAIOutputItem = {
  content?: OpenAIContentItem[]
}

type OpenAIResponsePayload = {
  output_text?: string
  output?: OpenAIOutputItem[]
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function extractTextResponse(response: OpenAIResponsePayload): string {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const parts =
    response?.output?.flatMap((item) =>
      item?.content?.flatMap((content) => {
        if (typeof content?.text === 'string') {
          return [content.text]
        }

        if (typeof content?.output_text === 'string') {
          return [content.output_text]
        }

        return []
      }) ?? []
    ) ?? []

  return parts.join('\n').trim()
}

function parseModelJson(value: string) {
  const normalized = value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  return JSON.parse(normalized)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResumeRequest
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'

    const fullName = clean(body.fullName)
    const email = clean(body.email)
    const targetRole = clean(body.targetRole)
    const yearsExperience = clean(body.yearsExperience)
    const skills = clean(body.skills)

    if (!apiKey) {
      return NextResponse.json(
        { message: 'Resume builder is not configured yet. Add OPENAI_API_KEY.' },
        { status: 500 }
      )
    }

    if (!fullName || !email || !targetRole || !yearsExperience || !skills) {
      return NextResponse.json(
        { message: 'Please complete the required fields before generating your resume.' },
        { status: 400 }
      )
    }

    const inputPayload = {
      fullName,
      email,
      phone: clean(body.phone),
      location: clean(body.location),
      linkedin: clean(body.linkedin),
      portfolio: clean(body.portfolio),
      targetRole,
      yearsExperience,
      professionalNotes: clean(body.professionalNotes),
      skills,
      certifications: clean(body.certifications),
      experiences: (body.experiences || [])
        .map((item) => ({
          company: clean(item.company),
          title: clean(item.title),
          location: clean(item.location),
          start: clean(item.start),
          end: clean(item.end),
          highlights: clean(item.highlights),
        }))
        .filter((item) => item.company || item.title || item.highlights),
      education: (body.education || [])
        .map((item) => ({
          institution: clean(item.institution),
          degree: clean(item.degree),
          year: clean(item.year),
        }))
        .filter((item) => item.institution || item.degree),
    }

    const prompt = `
You are an expert resume writer for professional candidates in India and global corporate markets.
Convert the following candidate details into a polished, ATS-friendly resume draft.

Rules:
- Return valid JSON only.
- Do not wrap the JSON in markdown code fences.
- Keep the tone professional, specific, and achievement-oriented.
- Improve weak bullet points into impact-led bullet points.
- Avoid buzzword stuffing.
- Keep the summary to 3-4 lines.
- Provide 6 to 10 core skills.
- Provide 3 to 5 career highlight bullets.
- For each role, produce 3 to 5 strong bullets.

Return this exact shape:
{
  "fullName": string,
  "targetRole": string,
  "contactLine": string,
  "headline": string,
  "summary": string,
  "coreSkills": string[],
  "strengths": string[],
  "experience": [
    {
      "company": string,
      "title": string,
      "location": string,
      "period": string,
      "bullets": string[]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "year": string,
      "details": string
    }
  ],
  "certifications": string[]
}

Candidate data:
${JSON.stringify(inputPayload, null, 2)}
`.trim()

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'medium' },
        input: prompt,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI resume generation failed:', errorText)
      return NextResponse.json(
        { message: 'AI resume generation failed. Check your OpenAI configuration.' },
        { status: 502 }
      )
    }

    const data = await openaiResponse.json()
    const outputText = extractTextResponse(data)

    if (!outputText) {
      return NextResponse.json(
        { message: 'The AI returned an empty response. Please try again.' },
        { status: 502 }
      )
    }

    const resume = parseModelJson(outputText)

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
