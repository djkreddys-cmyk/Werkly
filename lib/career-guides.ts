export type CareerGuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type CareerGuide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  sections: CareerGuideSection[];
};

export const careerGuides: CareerGuide[] = [
  {
    slug: "write-a-recruiter-friendly-resume",
    title: "How to write a recruiter-friendly resume",
    description:
      "A practical guide to presenting experience, skills, and results so recruiters can understand your fit quickly without losing important detail.",
    category: "Resume guidance",
    readingTime: "8 minute read",
    publishedAt: "2026-08-24",
    updatedAt: "2026-08-24",
    sections: [
      {
        heading: "Start with the decision your resume must support",
        paragraphs: [
          "A resume is not a complete autobiography. Its immediate job is to help a recruiter decide whether your recent experience, level, location, and skills justify a closer conversation. A good resume makes those signals easy to verify while still giving enough context for a hiring manager.",
          "Before editing, read the target job description and identify the five or six requirements that appear central to the work. Compare those requirements with projects you have genuinely completed. Use that overlap to decide what belongs near the top of the page. This is tailoring, not keyword copying: every claim should be supported by real experience that you can discuss in an interview.",
        ],
        bullets: [
          "Target role or professional headline",
          "Current location and realistic location preference",
          "Total relevant experience, not only total career length",
          "Core tools, domain knowledge, and certifications",
          "Notice period or availability when it matters to the role",
        ],
      },
      {
        heading: "Use a structure that works in a thirty-second review",
        paragraphs: [
          "Most recruiters first scan rather than read line by line. Put contact details, headline, short professional summary, key skills, work history, education, and relevant certifications in a predictable order. Keep decorative elements secondary to the information. Multi-column layouts can look attractive, but they may make dates and employment history harder to follow on a mobile screen.",
          "For experienced professionals, reverse chronological order is usually the clearest choice. Place the most recent role first and show employer, title, dates, location, responsibilities, and results together. Candidates with a career break can state dates honestly and briefly explain productive activity such as caregiving, study, freelance work, or health recovery when comfortable doing so.",
        ],
      },
      {
        heading: "Turn responsibilities into evidence",
        paragraphs: [
          "Job descriptions explain what a role was expected to do; resume bullets should show what you actually handled. Begin with a specific action, add the scope, and describe the result when a reliable figure is available. Instead of writing ‘responsible for recruitment,’ explain the functions hired for, approximate hiring volume, screening responsibility, stakeholder level, or turnaround improvement.",
          "Do not invent percentages to make a bullet look stronger. Useful evidence can be non-financial: number of sites supported, team size, audit type, production line, software module, customer segment, project stage, or complexity of coordination. A precise description without a percentage is more credible than an impressive number you cannot explain.",
        ],
        bullets: [
          "Weak: Worked on monthly reports.",
          "Clearer: Consolidated weekly sales and collection data for five branches into the monthly management report.",
          "Weak: Handled quality.",
          "Clearer: Reviewed incoming-material records and coordinated non-conformance closure with production and suppliers.",
        ],
      },
      {
        heading: "Make skills searchable and believable",
        paragraphs: [
          "Use the standard names of tools and methods that employers use, but separate real working knowledge from limited exposure. A short, grouped skills section is more useful than a long keyword paragraph. For example, divide software, technical methods, industry knowledge, and languages when the distinction helps the role.",
          "Avoid rating yourself with unexplained stars or percentage bars. Those scales have no shared meaning. Evidence inside work-history bullets is stronger: using SAP for purchase orders, AutoCAD for shop drawings, React for a customer portal, or Excel PivotTables for workforce reporting tells a reviewer how the skill was applied.",
        ],
      },
      {
        heading: "Complete a final accuracy and readability check",
        paragraphs: [
          "Save the finished resume as a PDF unless the employer asks for another format. Open the saved file on both a phone and a computer. Confirm that text can be selected, dates align, links work, and no content has moved to an almost-empty page. Use a straightforward filename such as Firstname-Lastname-Role.pdf.",
          "Finally, check phone number, email, employment dates, spelling of company names, and any compensation or notice-period information entered in the application form. Differences between the form and resume create avoidable questions. Keep a master resume for your records and a clearly named tailored copy for each type of role.",
        ],
        bullets: [
          "Remove sensitive identity numbers, bank details, and unnecessary full home addresses.",
          "Ask one person familiar with your work to test whether the first page reflects your actual strengths.",
          "Keep claims consistent with public profiles and documents you may later provide.",
          "Update the resume after important projects rather than trying to remember them months later.",
        ],
      },
    ],
  },
  {
    slug: "interview-preparation-checklist",
    title: "A practical interview preparation checklist",
    description:
      "Prepare relevant examples, research the role, test the interview setup, and follow up professionally with this step-by-step checklist.",
    category: "Interview preparation",
    readingTime: "9 minute read",
    publishedAt: "2026-08-24",
    updatedAt: "2026-08-24",
    sections: [
      {
        heading: "Understand what the employer is evaluating",
        paragraphs: [
          "Interview preparation begins with the job, not with memorising generic answers. Read the description again and sort the requirements into technical capability, business context, communication, ownership, and practical constraints such as location or shifts. Highlight any requirement that you cannot yet explain through a real example.",
          "Research the employer through its official website, current products, recent public announcements, and the interviewer’s professional background when available. The goal is not to recite company facts. It is to understand the environment well enough to ask useful questions and connect your experience to the work described.",
        ],
      },
      {
        heading: "Prepare a small library of evidence",
        paragraphs: [
          "Choose six to eight examples from your work that cover delivery, problem solving, teamwork, disagreement, learning, pressure, and a result you are proud of. For each example, note the situation, your specific responsibility, the actions you personally took, and the outcome. This structure keeps an answer focused while allowing the interviewer to ask for more detail.",
          "Include one example that did not go as planned. Explain the decision, the consequence, what you changed, and how you now reduce that risk. A credible learning example usually communicates better judgment than an answer claiming that nothing has gone wrong.",
        ],
        bullets: [
          "A difficult technical or operational problem you diagnosed",
          "A deadline that required prioritisation or escalation",
          "A stakeholder disagreement handled professionally",
          "A measurable improvement or quality outcome",
          "A new tool, process, or domain you learned quickly",
          "A mistake or missed assumption and what changed afterward",
        ],
      },
      {
        heading: "Rehearse the opening without scripting it",
        paragraphs: [
          "Your introduction should connect the present, relevant past, and reason for exploring the role. State your current professional focus, two or three experiences most relevant to the vacancy, and what kind of responsibility you want next. Keep it conversational and normally under two minutes.",
          "Practise aloud, but do not memorise every word. Scripted answers become difficult to adapt when the interviewer asks a slightly different question. A short outline helps you remain natural while covering the important evidence.",
        ],
      },
      {
        heading: "Prepare for practical and compensation questions",
        paragraphs: [
          "Be ready to state current location, preferred locations, notice period, interview availability, current compensation, and expected compensation accurately. If you prefer to understand role scope before discussing expectations, say so respectfully and provide a reasonable range when the process requires it.",
          "Do not hide a notice period or competing process until the final stage. Early clarity lets both sides plan. If a recruiter asks for documents before an offer, clarify why they are needed and use an official company channel. Never pay an individual to secure an interview or offer.",
        ],
      },
      {
        heading: "Check the interview environment",
        paragraphs: [
          "For a video interview, test the meeting link, browser permissions, microphone, camera, power supply, and internet connection. Join five to ten minutes early from a quiet place. Keep the job description, your resume, and a page for notes available without constantly looking away from the screen.",
          "For an in-person interview, confirm the full address, contact person, expected duration, access requirements, and documents requested. Plan travel with a buffer. If delay becomes unavoidable, contact the recruiter before the scheduled time rather than arriving silently late.",
        ],
        bullets: [
          "Prepare two questions about priorities, team structure, or success measures.",
          "Keep answers focused on your own contribution while recognising the team.",
          "Ask for clarification when a question is ambiguous.",
          "Send a short follow-up confirming interest and any promised information.",
        ],
      },
    ],
  },
  {
    slug: "evaluate-a-job-offer",
    title: "How to evaluate a job offer beyond salary",
    description:
      "Compare role scope, fixed and variable pay, growth, manager expectations, location, stability, and joining terms before accepting an offer.",
    category: "Career decisions",
    readingTime: "8 minute read",
    publishedAt: "2026-08-24",
    updatedAt: "2026-08-24",
    sections: [
      {
        heading: "Begin with the work you will actually do",
        paragraphs: [
          "A stronger title or higher package does not automatically create a better next step. Ask what outcomes the role owns during the first three, six, and twelve months. Compare those responsibilities with the interview discussion and written job description. If the scope remains vague, request clarification before accepting.",
          "Consider how much of the role builds expertise you want to use later. A position can be valuable because it offers larger scale, deeper technical work, people leadership, customer exposure, or ownership of a complete process. Decide which type of growth matters to you rather than relying only on designation.",
        ],
      },
      {
        heading: "Separate total CTC from dependable monthly value",
        paragraphs: [
          "Review the complete compensation structure. Identify fixed pay, variable pay, joining or retention bonuses, employer contributions, reimbursements, insurance, stock or long-term incentives, and deductions. Check the conditions for every variable component and when it is normally paid.",
          "Estimate monthly take-home using the offered structure and your likely tax situation, then compare it with new costs such as relocation, commuting, accommodation, meals, or childcare. A nominal increase can become smaller after these practical changes. Use written figures rather than verbal estimates.",
        ],
        bullets: [
          "Fixed annual compensation and monthly gross pay",
          "Performance-linked amount and realistic payout conditions",
          "Probation terms and whether compensation changes afterward",
          "Insurance coverage, leave, retirement contributions, and reimbursements",
          "Repayment clauses attached to bonuses, training, or relocation",
        ],
      },
      {
        heading: "Evaluate the manager and operating environment",
        paragraphs: [
          "The immediate manager strongly affects priorities, feedback, and development. Reflect on how clearly expectations were explained during interviews. Ask how work is reviewed, how often priorities change, and what support exists when decisions require escalation.",
          "Also consider team size, vacancy reason, working hours, travel, shift expectations, remote-work terms, and tools available. None of these factors is automatically positive or negative; the important point is whether the reality fits your commitments and preferred way of working.",
        ],
      },
      {
        heading: "Check stability without expecting certainty",
        paragraphs: [
          "No employer can guarantee the future, but you can examine the business model, customer concentration, funding or profitability information that is publicly available, and the importance of the function you are joining. Ask how the role contributes to current priorities and why the position is open.",
          "For an early-stage or rapidly changing company, uncertainty may come with broader responsibility and faster learning. For an established organisation, process depth may be stronger but role boundaries may be narrower. Compare the trade-off with your current financial obligations and tolerance for change.",
        ],
      },
      {
        heading: "Read every joining condition before resigning",
        paragraphs: [
          "Confirm employer legal name, title, location, reporting relationship, compensation, joining date, probation, notice period, background verification, and any pre-employment conditions in writing. Ask questions when clauses are unclear. Keep copies of the signed offer and correspondence.",
          "Do not resign solely on an informal message. If the offer depends on verification or a client approval, understand what remains pending. Once you accept, communicate promptly if circumstances change. Professional transparency protects both your reputation and the employer’s planning.",
        ],
        bullets: [
          "Score each offer against the same criteria rather than comparing by memory.",
          "Discuss the decision with someone who understands your priorities, not only the salary figure.",
          "Negotiate the most important one or two issues with evidence and a clear request.",
          "Decline respectfully when the role is not right; recruitment networks are long-term.",
        ],
      },
    ],
  },
];

export function getCareerGuide(slug: string) {
  return careerGuides.find((guide) => guide.slug === slug);
}

