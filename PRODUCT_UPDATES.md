# Product Updates

## AI Candidate Matching Upgrade

### What changed
- Improved candidate suggestions for each job with smarter AI-assisted ranking.
- Matching now considers role intent, skills, domain, location preference, experience range, resume availability, profile completeness, and recent CRM activity.
- Added synonym understanding for common recruiter terms such as BD/BDE, HR/recruiter, QA/QC, civil/construction, accounts/finance, and sales/business development.
- Experience range matching is more accurate for requirements such as `3-5 years`.
- Flexible locations such as remote, hybrid, pan India, any location, and multiple locations are handled better.
- More CRM profiles are reviewed before AI ranking, helping recruiters find stronger hidden matches.
- AI recruiter notes are stricter about must-have role, domain, experience, and location gaps.

### Recruiter benefit
Recruiters can open a job profile and get more accurate suggested CRM profiles, with clearer fit reasons and concerns before shortlisting candidates.

### Where to use it
Go to `Jobs -> Existing Jobs -> View Job -> Suggested CRM Profiles`.

### Deployment note
Requires frontend deployment. AI ranking requires `OPENAI_API_KEY` to be configured; otherwise the system falls back to improved rule-based matching.
