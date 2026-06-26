# Werkly Candidate Mobile App

Flutter prototype for the candidate-facing Werkly app.

## Scope

### High Priority

- Candidate login/register connected to Railway backend
- Profile edit/save with real backend sync
- Resume upload/download with document storage
- Job listing from live `werkly.in` jobs API
- Job detail page with one-tap apply
- Saved jobs synced to backend
- Application tracking from real candidate applications
- Notifications center for interview/application updates
- Offline draft save for profile and resume builder
- Basic push notification setup

### Good UX Updates

- Better onboarding flow for first-time candidates
- Profile completion checklist
- Resume quality score
- Job match score and why the candidate matches
- Filter chips for role, location, salary, sector, IT/Non-IT, experience, and job type
- Document center for certificates, ID proof, offer letters, and experience letters
- Share resume/job via WhatsApp and email
- Dark mode
- Telugu/Hindi support later

### Advanced Later

- AI resume assistant
- Interview preparation tips
- Video intro profile
- Referral jobs
- Candidate analytics for profile views, applications, shortlist rate, and resume downloads

## Current Prototype Coverage

- Smart candidate profile with personal details, education, experience, skills, CTC, notice period, and location preferences
- Candidate onboarding and profile completion checklist
- Step-by-step resume builder with templates, preview, upload, PDF, and Word actions
- Resume quality score and template choices for Classic, Modern, Sidebar, and Compact styles
- Job search with role, sector, location, experience, salary, job type, and IT/Non-IT filters
- Job detail, job alerts, apply confirmation, saved jobs page preview, and match logic
- One-tap apply using saved profile and resume
- Saved jobs and recommended jobs with match score reasoning
- Application tracking from Applied to Joined / Rejected
- Application detail page, recruiter chat, interview calendar, and application filters
- Interview alerts, push-notification surfaces, and in-app messages
- Notifications center for job matches, interviews, application updates, and recruiter messages
- Document center for resumes, certificates, ID proof, offer letters, and experience letters
- Document upload flow for all candidate document types
- Bottom navigation, quick action cards, progress indicators, and mobile-friendly job cards
- Offline drafts, dark mode, language support, WhatsApp/email sharing, AI resume suggestions, interview preparation, video intro, and referral job roadmap
- Candidate analytics and help/support sections

## Run

```powershell
cd candidate_mobile
flutter pub get
flutter run
```

To point the app at Railway or a local backend, pass:

```powershell
flutter run --dart-define=WERKLY_API_BASE_URL=https://your-railway-domain
```

For local backend testing:

```powershell
flutter run -d chrome --web-port 51270 --dart-define=WERKLY_API_BASE_URL=http://localhost:4000
```

The app is intentionally candidate-facing. It does not include employee or admin workflows.
