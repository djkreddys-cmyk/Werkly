export type CareerGuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type CareerGuide = {
  slug: string;
  title: string;
  description: string;
  audience: "Candidates" | "Employers";
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
    audience: "Candidates",
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
    audience: "Candidates",
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
    audience: "Candidates",
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
  {
    slug: "read-a-job-description-before-applying",
    title: "How to read a job description before applying",
    description:
      "Separate essential requirements from preferences, assess your evidence, and make a better application decision without matching every line.",
    audience: "Candidates",
    category: "Application decisions",
    readingTime: "8 minute read",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      {
        heading: "Identify the business problem behind the vacancy",
        paragraphs: [
          "A job description is easier to evaluate when you first ask why the position exists. Look for the outcome the employer needs: increasing production capacity, improving financial control, supporting customers, launching a product, replacing a specialist, or building a new team. The title alone may not explain that purpose, especially when companies use different titles for similar work.",
          "Read the opening summary, reporting line, and first group of responsibilities together. Repeated themes usually reveal the central work. If stakeholder coordination, month-end closure, machine maintenance, or software delivery appears several times, treat it as a stronger signal than a tool mentioned once near the bottom.",
        ],
        bullets: [
          "What result is this person expected to produce?",
          "Which team, customer, plant, product, or process will the role support?",
          "Is the vacancy primarily individual delivery, coordination, or people leadership?",
          "Which practical condition—location, shift, travel, or joining time—shapes the role?",
        ],
      },
      {
        heading: "Separate essential evidence from preferred exposure",
        paragraphs: [
          "Requirements are not always written in order of importance. Classify them into essential, preferred, and learnable. An essential requirement is usually tied to safe or lawful work, immediate delivery, a scarce technical capability, or a customer commitment. Preferred requirements improve fit but may be flexible when the candidate has strong adjacent experience.",
          "Compare each essential requirement with evidence you can explain. Evidence can come from employment, projects, internships, freelance assignments, education, or certifications, depending on the level of the role. Do not count a keyword as evidence unless you can describe how you used it, what scope you handled, and what happened as a result.",
        ],
      },
      {
        heading: "Check level, context, and practical fit",
        paragraphs: [
          "Years of experience are only one indicator of level. Review decision authority, team size, complexity, budget, customer exposure, and the consequences of errors. A person with fewer years may still be relevant when the scope closely matches; a person with more years may be unsuitable if the role is substantially narrower than current responsibilities.",
          "Also assess conditions that cannot be solved by resume editing. Confirm location, working model, shift, travel, compensation range when published, notice-period expectation, and employment type. Applying despite a known conflict can waste time for both sides unless you clearly state what flexibility you need.",
        ],
        bullets: [
          "Apply when you meet most central requirements and can explain the adjacent skills you would transfer.",
          "Ask before applying when a critical condition or qualification is unclear.",
          "Do not change dates, titles, or skill claims merely to create a match.",
          "Use the job ID when contacting a recruiter about a specific Werkly vacancy.",
        ],
      },
      {
        heading: "Tailor the application around truthful overlap",
        paragraphs: [
          "Once you decide to apply, adjust the order and emphasis of your resume so relevant evidence is easy to find. Bring the most applicable summary, skills, projects, and recent responsibilities forward. Keep the official employment history accurate and retain context that a hiring manager needs to understand your contribution.",
          "A short application note can explain a useful connection that the resume does not make obvious—for example, relocating to the advertised city, returning to a former industry, or applying a similar process in a different sector. Keep the note specific. A focused explanation is more valuable than a long generic statement about being hardworking and passionate.",
        ],
      },
    ],
  },
  {
    slug: "explain-a-career-break-professionally",
    title: "How to explain a career break professionally",
    description:
      "Present employment gaps accurately, show relevant activity without oversharing, and prepare a calm explanation for recruiter and interview conversations.",
    audience: "Candidates",
    category: "Career transitions",
    readingTime: "8 minute read",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      {
        heading: "State the timeline clearly",
        paragraphs: [
          "A career break is easier to understand when employment dates are consistent and the period is not hidden through a misleading resume format. Use month and year for roles throughout the document. If the break is recent or long enough to raise an obvious question, add a simple entry such as Career Break, Family Care, Full-Time Study, Health Recovery, Relocation, or Independent Projects.",
          "You do not need to disclose private medical or family details. The useful information is the timing, broad reason, current readiness, and any professional activity relevant to the next role. A concise, factual line prevents the reader from guessing while preserving appropriate boundaries.",
        ],
      },
      {
        heading: "Describe activity only when it adds evidence",
        paragraphs: [
          "Courses, certifications, volunteer work, freelance assignments, portfolio projects, or industry reading can support the story when they were genuine and relevant. Describe what you completed or produced rather than listing every webinar attended. If the break was fully dedicated to personal responsibilities, it is acceptable to say that without inventing professional activity.",
          "Recent evidence is particularly helpful for tools or regulations that change quickly. A finance candidate might refresh reporting or spreadsheet skills; a software candidate might build and deploy a small application; a manufacturing candidate might review updated quality methods. The aim is to demonstrate current capability, not to apologise for time away.",
        ],
        bullets: [
          "Name the course or project and the month completed.",
          "Explain the practical output, assessment, or tool used.",
          "Link a portfolio only when it is complete and safe to share.",
          "Avoid claiming employment when the activity was informal or self-directed.",
        ],
      },
      {
        heading: "Prepare a short interview explanation",
        paragraphs: [
          "A useful answer normally has three parts: why you stepped away, what is relevant about the period, and why you are ready now. Keep the first part brief and spend more time on present capability and the role ahead. Practise the answer aloud so it sounds settled rather than defensive.",
          "For example: ‘I took a planned break for family care from March 2024 to January 2026. During the later part of the break I refreshed advanced Excel and completed two reporting projects. My availability is now stable, and I am focusing on finance operations roles where I can use my earlier month-end and reconciliation experience.’ Adapt the structure to your facts rather than copying the wording.",
        ],
      },
      {
        heading: "Check readiness before beginning the search",
        paragraphs: [
          "Before applying widely, confirm working hours, location, travel, joining availability, and any support arrangements that affect your decision. Identify references and documents early, especially when previous employment ended several years ago. Tell the recruiter about a non-negotiable condition before the interview process becomes advanced.",
          "Expect that re-entry may involve a similar title, an adjacent role, a short project, or a period of rebuilding recent experience. Evaluate the complete opportunity rather than treating the first offer as the only route back. A transparent break does not remove your previous achievements; it gives the employer the context needed to assess them fairly.",
        ],
      },
    ],
  },
  {
    slug: "verify-recruitment-messages-and-avoid-job-scams",
    title: "How to verify recruitment messages and avoid job scams",
    description:
      "Use practical checks for recruiter identity, vacancy details, payment requests, documents, links, interviews, and written offers.",
    audience: "Candidates",
    category: "Recruitment safety",
    readingTime: "9 minute read",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      {
        heading: "Verify the recruiter and the vacancy separately",
        paragraphs: [
          "A real-looking profile does not prove that a message or vacancy is genuine. Check the sender’s email domain, phone number, company profile, and the role information through an independent channel. For a Werkly vacancy, look for the job on the official Werkly website and refer to its job ID when contacting hr@werkly.in.",
          "Be cautious when the sender avoids naming the employer, cannot explain the responsibilities, promises selection without assessment, or creates pressure to act immediately. Confidential searches do exist, but a legitimate recruiter should still be able to explain the role, location, process, and reason certain information cannot yet be shared.",
        ],
        bullets: [
          "Type the official website address yourself instead of trusting only the message link.",
          "Compare the sender address character by character with the published company domain.",
          "Call a verified switchboard or official number when the request is unusual.",
          "Save the job ID, recruiter name, date, and communication channel.",
        ],
      },
      {
        heading: "Treat payment requests as a serious warning",
        paragraphs: [
          "Werkly does not ask candidates to pay an individual to obtain an interview or job offer. Requests for registration fees, refundable deposits, security payments, equipment purchases, training charges, visa processing through a personal account, or gift cards should be independently verified before any action.",
          "A written promise that money will be refunded does not make the request safe. Do not rely on screenshots of payment receipts or offer letters supplied by the sender. Stop the conversation, preserve the evidence, and contact the employer or consultancy using contact information obtained separately.",
        ],
      },
      {
        heading: "Limit documents and personal information",
        paragraphs: [
          "A resume normally contains enough information for initial screening. Government identity numbers, bank details, card information, passwords, one-time passwords, and full document sets are not required to decide whether an interview should occur. Ask why a document is needed, who will receive it, how it will be stored, and whether a safer alternative is available.",
          "When documents are legitimately required later, use an official portal or verified company channel. Consider adding a purpose watermark to copies when appropriate and permitted. Never install remote-access software or share a screen while banking because someone claims it is part of recruitment verification.",
        ],
        bullets: [
          "Do not share OTPs or account passwords with a recruiter.",
          "Check shortened links before opening them and avoid unknown executable files.",
          "Confirm the meeting domain and interviewer identity for online interviews.",
          "Report impersonation with screenshots, sender details, and the original link.",
        ],
      },
      {
        heading: "Review the offer through official channels",
        paragraphs: [
          "Before resigning or relocating, confirm the employer’s legal name, role, location, reporting line, compensation structure, joining date, conditions, and authorised signatory. Verify the offer through an official company contact if any detail conflicts with the interviews or arrives from an unrelated domain.",
          "Fraud can imitate real companies and real vacancies. The strongest protection is a consistent trail: a published or verifiable role, identifiable people, a credible assessment process, official communication, and written terms that match the discussion. If one part is doubtful, pause and verify rather than allowing urgency to make the decision.",
        ],
      },
    ],
  },
  {
    slug: "write-an-effective-hiring-brief",
    title: "How employers can write an effective hiring brief",
    description:
      "Turn a vacancy request into a usable search plan by defining outcomes, evidence, constraints, decision ownership, and candidate communication.",
    audience: "Employers",
    category: "Role intake",
    readingTime: "9 minute read",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      {
        heading: "Begin with the reason for hiring",
        paragraphs: [
          "A recruiter can search more accurately when the brief explains why the position exists. State whether it is a replacement, growth role, new capability, project requirement, succession need, or urgent operational gap. Describe the business result expected during the first six to twelve months rather than beginning with a long list of activities.",
          "The vacancy reason also changes candidate communication. A confidential replacement requires controlled disclosure; a new team may need a clear explanation of what is already established; an urgent operational role needs realistic joining priorities. Agree what the recruiter may share before outreach begins.",
        ],
      },
      {
        heading: "Define evidence for each essential requirement",
        paragraphs: [
          "Replace broad adjectives with observable evidence. ‘Strong leadership’ might mean supervising three shifts, improving safety discipline, or developing first-line managers. ‘Good communication’ might mean presenting monthly results to a customer or coordinating technical decisions across functions. The evidence tells recruiters what to test during screening.",
          "Separate essential requirements from preferences and explain why each essential item matters. If every item is mandatory, the search may become artificially narrow. Identify adjacent industries, tools, or qualifications that could transfer successfully and specify which skills the organisation can teach after joining.",
        ],
        bullets: [
          "Role purpose and three to five priority outcomes",
          "Reporting line, team size, decision authority, and stakeholders",
          "Essential experience with examples of acceptable evidence",
          "Preferred exposure and realistic transferable backgrounds",
          "Location, shift, travel, employment type, and joining constraints",
        ],
      },
      {
        heading: "Align compensation and market constraints early",
        paragraphs: [
          "Provide the approved fixed and variable structure, internal flexibility, benefits that materially affect the offer, and any constraints on current compensation. If the budget is below the likely market for the combined requirements, decide which part of the brief can change before large-scale sourcing begins.",
          "Market feedback should be recorded rather than treated as a series of isolated candidate rejections. After an agreed sample of profiles or conversations, review recurring gaps such as location, notice period, package, title, industry, or skill combination. A timely adjustment protects recruiter effort and hiring timelines.",
        ],
      },
      {
        heading: "Design the selection process with ownership",
        paragraphs: [
          "List each interview stage, assessor, purpose, likely duration, location or meeting method, and decision deadline. Avoid multiple stages that repeat the same assessment. Where practical, agree a scorecard before interviews so candidate comparisons return to the role outcomes rather than personal style alone.",
          "Assign one person to consolidate feedback and communicate changes to the recruiter. Confirm who can approve exceptions and the final offer. A clear brief is not only a sourcing document; it is the operating agreement that keeps search, assessment, candidate experience, and closing decisions aligned.",
        ],
        bullets: [
          "Set a feedback target after each interview.",
          "Name the final decision maker and backup approver.",
          "Prepare truthful information about team, work conditions, and growth.",
          "Update the brief when the role changes instead of screening against two versions.",
        ],
      },
    ],
  },
  {
    slug: "build-a-structured-interview-scorecard",
    title: "How to build a structured interview scorecard",
    description:
      "Create consistent interview criteria, evidence-based ratings, focused questions, and useful feedback without turning the conversation into a checklist exercise.",
    audience: "Employers",
    category: "Interview design",
    readingTime: "9 minute read",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      {
        heading: "Translate the hiring brief into assessable criteria",
        paragraphs: [
          "Choose a small set of criteria connected directly to successful performance. A scorecard may cover technical or functional capability, problem solving, delivery ownership, stakeholder communication, people leadership, and relevant practical conditions. The exact categories should change with the role rather than using one generic form for every vacancy.",
          "For each criterion, describe the evidence expected at the required level. A production leader might need examples involving output, rejection, downtime, safety, and shift ownership. An HR recruiter might need sourcing strategy, screening judgment, stakeholder handling, data discipline, and closure evidence. Specific anchors make ratings easier to compare.",
        ],
      },
      {
        heading: "Use questions that produce verifiable evidence",
        paragraphs: [
          "Ask candidates to explain a relevant situation, their responsibility, the actions they personally took, the result, and what they learned. Follow-up questions should test scale, constraints, alternatives, and individual contribution. Hypothetical questions can be useful, but past examples often provide stronger evidence of how someone has operated.",
          "Give every candidate a consistent core set of questions while allowing reasonable follow-up. Consistency improves comparison; follow-up preserves depth. Avoid questions about protected or private characteristics that are unrelated to performing the job, and keep personal information out of written scorecard comments.",
        ],
        bullets: [
          "What was the starting situation and your specific responsibility?",
          "What information or options did you consider?",
          "What action did you personally take?",
          "What result occurred, and how was it measured?",
          "What would you repeat or change next time?",
        ],
      },
      {
        heading: "Define a rating scale before interviews",
        paragraphs: [
          "A simple four-point scale can reduce the temptation to select a neutral middle score: insufficient evidence, partial evidence, meets the requirement, and exceeds the requirement. Describe what each level means for the criterion. Require a short evidence note rather than accepting a number alone.",
          "Interviewers should complete independent notes before group discussion where possible. Early discussion can cause later assessors to repeat the first strong opinion. During the decision meeting, compare evidence and investigate rating differences instead of averaging scores that may represent different interpretations.",
        ],
      },
      {
        heading: "Turn feedback into a clear decision",
        paragraphs: [
          "Record strengths, material risks, missing evidence, and any follow-up required. Distinguish a skill gap from an interview gap: the candidate may lack the capability, or the panel may simply not have tested it. A focused second discussion is more useful than adding another broad interview.",
          "Close the scorecard with a clear recommendation—progress, hold for defined information, or decline—with the reason tied to agreed criteria. Share appropriate feedback with the recruiter promptly. Structured evidence helps the employer make a defensible decision and allows candidates to receive timely, consistent communication.",
        ],
        bullets: [
          "Do not use culture fit as an unexplained rating.",
          "Separate trainable gaps from risks central to immediate delivery.",
          "Document changed requirements before reassessing candidates.",
          "Review whether the scorecard predicted performance after hiring.",
        ],
      },
    ],
  },
  {
    slug: "keep-candidates-informed-during-hiring",
    title: "How employers can keep candidates informed during hiring",
    description:
      "Design practical status communication from application acknowledgement through interviews, holds, offers, rejection, and joining follow-up.",
    audience: "Employers",
    category: "Candidate experience",
    readingTime: "8 minute read",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    sections: [
      {
        heading: "Define what each recruitment status means",
        paragraphs: [
          "Status labels are useful only when recruiters and hiring managers interpret them consistently. Define the entry and exit condition for applied, screened, shortlisted, interview scheduled, interview completed, on hold, selected, offered, joined, rejected, and withdrawn. Remove stages the organisation does not actually use.",
          "Connect every active status with an owner and next action. ‘Interview completed’ should identify who owes feedback and by when. ‘On hold’ should include the reason, review date, and what can be told to the candidate. This prevents records from appearing active while no decision is moving.",
        ],
      },
      {
        heading: "Set communication expectations at the beginning",
        paragraphs: [
          "Acknowledge a relevant application and explain the likely process without promising selection. Before the first interview, confirm role title, employer name when disclosure is permitted, format, participants, expected duration, preparation required, and a contact for scheduling problems.",
          "If the process normally takes several weeks, say so. Candidates make decisions about other interviews, notice periods, travel, and personal commitments using the information provided. A realistic timeline creates more trust than an optimistic deadline that repeatedly moves without explanation.",
        ],
        bullets: [
          "Use the same job title and job ID across messages.",
          "Confirm time zone and meeting mode for every interview.",
          "Send changes through a verified channel as soon as they are known.",
          "Avoid asking for the same information repeatedly when it is already recorded.",
        ],
      },
      {
        heading: "Communicate delays and holds honestly",
        paragraphs: [
          "Silence often causes stronger candidates to disengage. When feedback or approval is delayed, send a short update stating that the process remains open, what is pending, and when the next update is expected. Do not claim that a decision is imminent when there is no confirmed timeline.",
          "A hold should not be used to keep an unlimited backup pipeline. Review held candidates on a scheduled date and release them when the vacancy, budget, or requirement is no longer active. Candidates can then make informed choices, and recruiters maintain a more accurate pipeline.",
        ],
      },
      {
        heading: "Close every advanced process professionally",
        paragraphs: [
          "After interviews, communicate the decision through the agreed channel. Feedback should be factual, respectful, and limited to job-related criteria. Where detailed feedback cannot be provided, a clear closure is still better than leaving the candidate waiting. Record the reason internally using consistent categories rather than personal remarks.",
          "For selected candidates, keep communication active between verbal selection, written offer, acceptance, resignation, verification, and joining. Confirm outstanding conditions and ownership. For rejected or withdrawn candidates, preserve accurate records and consent preferences so future contact is relevant rather than repetitive.",
        ],
        bullets: [
          "Track promised update dates as tasks, not memory.",
          "Escalate overdue feedback with the business impact visible.",
          "Use templates as a starting point and personalise material details.",
          "Measure stage time and withdrawal reasons to improve the process.",
        ],
      },
    ],
  },
];

export function getCareerGuide(slug: string) {
  return careerGuides.find((guide) => guide.slug === slug);
}
