import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';

void main() {
  runApp(const WerklyCandidateApp());
}

class WerklyCandidateApp extends StatefulWidget {
  const WerklyCandidateApp({super.key});

  @override
  State<WerklyCandidateApp> createState() => _WerklyCandidateAppState();
}

class _WerklyCandidateAppState extends State<WerklyCandidateApp> {
  bool darkMode = false;
  CandidateSession? candidateSession;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Werkly Candidate',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: darkMode ? ThemeMode.dark : ThemeMode.light,
      home: CandidateShell(
        darkMode: darkMode,
        candidateSession: candidateSession,
        onDarkModeChanged: (value) => setState(() => darkMode = value),
        onCandidateSessionChanged: (session) =>
            setState(() => candidateSession = session),
      ),
    );
  }
}

class CandidateSession {
  const CandidateSession({
    required this.token,
    required this.candidate,
    required this.profile,
  });

  final String token;
  final Map<String, dynamic> candidate;
  final Map<String, dynamic> profile;

  CandidateSession withProfile(Map<String, dynamic> updatedProfile) {
    final updatedCandidate = Map<String, dynamic>.from(candidate);
    for (final key in ['fullName', 'email', 'phone']) {
      if (updatedProfile[key] != null) updatedCandidate[key] = updatedProfile[key];
    }
    return CandidateSession(
      token: token,
      candidate: updatedCandidate,
      profile: updatedProfile,
    );
  }

  String get displayName =>
      (candidate['fullName'] ?? candidate['name'] ?? 'Candidate').toString();
  String get email => (candidate['email'] ?? '').toString();

  String get phone => (candidate['phone'] ?? profile['phone'] ?? '').toString();
  String get initials {
    final parts = displayName
        .split(RegExp(r'\s+'))
        .where((part) => part.trim().isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'WC';
    return parts.take(2).map((part) => part[0].toUpperCase()).join();
  }

  String profileText(String key, [String fallback = 'Pending']) {
    final value = profile[key];
    if (value == null) return fallback;
    if (value is List) {
      return value.where((item) => '$item'.trim().isNotEmpty).join(', ');
    }
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  List<String> get skills {
    final value = profile['skills'];
    if (value is List) {
      return value
          .map((item) => item.toString())
          .where((item) => item.trim().isNotEmpty)
          .toList();
    }
    final text = value?.toString() ?? '';
    return text
        .split(',')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  int get profileCompletion {
    final live = int.tryParse('${profile['profileCompletion'] ?? ''}');
    if (live != null && live > 0) return live.clamp(0, 100);
    final checks = [
      displayName != 'Candidate',
      email.isNotEmpty || phone.isNotEmpty,
      profileText('education', '').isNotEmpty,
      profileText('experience', '').isNotEmpty,
      skills.isNotEmpty,
      profileText('preferredRole', '').isNotEmpty,
      profileText('expectedCtc', '').isNotEmpty,
      profileText('noticePeriod', '').isNotEmpty,
      profileText('preferredLocation', '').isNotEmpty,
      profileText('resumeFileName', '').isNotEmpty,
    ];
    return ((checks.where((done) => done).length / checks.length) * 100)
        .round();
  }
}

class CandidateJob {
  const CandidateJob({
    required this.slug,
    required this.title,
    required this.sector,
    required this.location,
    required this.salary,
    required this.experience,
    required this.type,
    required this.match,
    required this.reason,
    required this.summary,
    required this.description,
    required this.responsibilities,
    required this.requirements,
    required this.deadline,
  });

  final String slug;
  final String title;
  final String sector;
  final String location;
  final String salary;
  final String experience;
  final String type;
  final String match;
  final String reason;
  final String summary;
  final String description;
  final List<String> responsibilities;
  final List<String> requirements;
  final String deadline;

  factory CandidateJob.fromJson(Map<String, dynamic> json) {
    final skills = json['skills'] is List
        ? (json['skills'] as List).map((item) => item.toString()).toList()
        : <String>[];
    final sector = (json['sector'] ?? 'Werkly verified role').toString();
    final location = (json['location'] ?? 'Location flexible').toString();
    final salary = (json['packagePerAnnum'] ?? json['salary'] ?? 'As per role')
        .toString();

    return CandidateJob(
      slug: (json['slug'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Werkly job').toString(),
      sector: sector,
      location: location,
      salary: salary,
      experience: (json['experience'] ?? 'Relevant experience').toString(),
      type: (json['employmentType'] ?? 'Full Time').toString(),
      match: 'Live',
      reason: skills.isEmpty
          ? '$sector, $location, $salary'
          : skills.take(3).join(', '),
      summary: (json['summary'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      responsibilities: json['responsibilities'] is List
          ? (json['responsibilities'] as List)
                .map((item) => item.toString())
                .toList()
          : const [],
      requirements: json['requirements'] is List
          ? (json['requirements'] as List)
                .map((item) => item.toString())
                .toList()
          : const [],
      deadline: (json['lastDateToApply'] ?? '').toString(),
    );
  }
}

class CandidateApi {
  static const baseUrl = String.fromEnvironment(
    'WERKLY_API_BASE_URL',
    defaultValue: 'https://werkly-production.up.railway.app',
  );

  static Future<CandidateSession> login({
    required String identifier,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/candidate/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'password': password}),
    );
    return _readSession(response);
  }

  static Future<CandidateSession> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/candidate/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'preferredRole': 'ERP Manager',
        'expectedCtc': '15 LPA',
        'noticePeriod': '30 days',
        'preferredLocation': 'Hyderabad',
      }),
    );
    return _readSession(response);
  }

  static Future<Map<String, dynamic>> loadMe(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/candidate/me'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return _readJson(response);
  }

  static Future<Map<String, dynamic>> updateProfile(
    String token,
    Map<String, dynamic> payload,
  ) async {
    final response = await http.put(
      Uri.parse('$baseUrl/candidate/me/profile'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );
    final data = _readJson(response);
    return Map<String, dynamic>.from(data['profile'] ?? {});
  }

  static Future<List<Map<String, dynamic>>> loadApplications(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/candidate/applications'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final data = _readJson(response);
    final applications = data['applications'] is List
        ? data['applications'] as List
        : const [];
    return applications
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  static Future<List<CandidateJob>> loadJobs() async {
    final response = await http.get(Uri.parse('$baseUrl/jobs'));
    final data = _readJson(response);
    final jobs = data['jobs'] is List ? data['jobs'] as List : const [];
    return jobs
        .whereType<Map>()
        .map((job) => CandidateJob.fromJson(Map<String, dynamic>.from(job)))
        .toList();
  }

  static CandidateSession _readSession(http.Response response) {
    final data = _readJson(response);
    return CandidateSession(
      token: (data['token'] ?? '').toString(),
      candidate: Map<String, dynamic>.from(data['candidate'] ?? {}),
      profile: Map<String, dynamic>.from(data['profile'] ?? {}),
    );
  }

  static Map<String, dynamic> _readJson(http.Response response) {
    final data = jsonDecode(response.body.isEmpty ? '{}' : response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        data is Map && data['message'] != null
            ? data['message'].toString()
            : 'Request failed with status ${response.statusCode}',
      );
    }
    return Map<String, dynamic>.from(data as Map);
  }
}

class AppColors {
  static const brand = Color(0xFF08606C);
  static const brandDark = Color(0xFF063F47);
  static const accent = Color(0xFFF1A64B);
  static const accentStrong = Color(0xFFBE481A);
  static const paper = Color(0xFFF8F4EE);
  static const surface = Color(0xFFFFFDF9);
  static const ink = Color(0xFF17353D);
  static const muted = Color(0xFF6C7A80);
  static const line = Color(0x2208606C);
}

class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.paper,
    fontFamily: 'Roboto',
    textTheme: const TextTheme(
      bodyMedium: TextStyle(fontWeight: FontWeight.w400),
      bodyLarge: TextStyle(fontWeight: FontWeight.w400),
      titleMedium: TextStyle(fontWeight: FontWeight.w500),
      titleLarge: TextStyle(fontWeight: FontWeight.w400),
    ),
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.brand,
      primary: AppColors.brand,
      secondary: AppColors.accent,
      surface: AppColors.surface,
    ),
  );

  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: const Color(0xFF0D181B),
    fontFamily: 'Roboto',
    textTheme: const TextTheme(
      bodyMedium: TextStyle(fontWeight: FontWeight.w400),
      bodyLarge: TextStyle(fontWeight: FontWeight.w400),
      titleMedium: TextStyle(fontWeight: FontWeight.w500),
      titleLarge: TextStyle(fontWeight: FontWeight.w400),
    ),
    colorScheme: ColorScheme.fromSeed(
      brightness: Brightness.dark,
      seedColor: AppColors.brand,
      primary: AppColors.accent,
      secondary: AppColors.brand,
      surface: const Color(0xFF132427),
    ),
  );
}

class CandidateShell extends StatefulWidget {
  const CandidateShell({
    super.key,
    required this.darkMode,
    required this.candidateSession,
    required this.onDarkModeChanged,
    required this.onCandidateSessionChanged,
  });

  final bool darkMode;
  final CandidateSession? candidateSession;
  final ValueChanged<bool> onDarkModeChanged;
  final ValueChanged<CandidateSession?> onCandidateSessionChanged;

  @override
  State<CandidateShell> createState() => _CandidateShellState();
}

class _CandidateShellState extends State<CandidateShell> {
  int currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.candidateSession == null) {
      return Scaffold(
        body: SafeArea(
          child: LoginScreen(
            onCandidateSessionChanged: widget.onCandidateSessionChanged,
          ),
        ),
      );
    }

    final screens = [
      HomeScreen(candidateSession: widget.candidateSession!),
      JobsScreen(candidateSession: widget.candidateSession!),
      ResumeScreen(candidateSession: widget.candidateSession!),
      const ApplicationsScreen(),
      ProfileScreen(
        darkMode: widget.darkMode,
        candidateSession: widget.candidateSession,
        onDarkModeChanged: widget.onDarkModeChanged,
        onCandidateSessionChanged: widget.onCandidateSessionChanged,
      ),
    ];

    return Scaffold(
      body: SafeArea(child: screens[currentIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) => setState(() => currentIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.work_outline),
            selectedIcon: Icon(Icons.work),
            label: 'Jobs',
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            selectedIcon: Icon(Icons.description),
            label: 'Resume',
          ),
          NavigationDestination(
            icon: Icon(Icons.timeline_outlined),
            selectedIcon: Icon(Icons.timeline),
            label: 'Track',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, required this.onCandidateSessionChanged});

  final ValueChanged<CandidateSession?> onCandidateSessionChanged;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const LoginLogoPanel(),
                  const SizedBox(height: 18),
                  CandidateLoginCard(
                    session: null,
                    onSessionChanged: onCandidateSessionChanged,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class LoginLogoPanel extends StatelessWidget {
  const LoginLogoPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 128,
      width: double.infinity,
      child: Center(
        child: Image.asset(
          'assets/werkly_logo.png',
          width: 126,
          height: 126,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.candidateSession});

  final CandidateSession candidateSession;

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
        ? 'Good afternoon'
        : 'Good evening';
    return ScreenFrame(
      eyebrow: 'Werkly Candidate',
      title: '$greeting, ${candidateSession.displayName}',
      trailing: CircleAvatar(
        radius: 23,
        backgroundColor: AppColors.brand,
        child: Text(
          candidateSession.initials,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w400,
          ),
        ),
      ),
      children: [
        OnboardingFlowCard(session: candidateSession),
        ProfileStrengthCard(session: candidateSession),
        ProfileCompletionChecklistCard(session: candidateSession),
        MetricStrip(session: candidateSession),
      ],
    );
  }
}

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key, required this.candidateSession});

  final CandidateSession candidateSession;

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  bool loadingJobs = true;
  String jobsError = '';
  List<CandidateJob> liveJobs = const [];
  final searchController = TextEditingController();
  final activeFilters = <String, Set<String>>{};

  @override
  void initState() {
    super.initState();
    loadLiveJobs();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  void addSearchFilter(String value) {
    final filter = value.trim();
    if (filter.isEmpty) return;
    final category = filterCategory(filter);
    setState(
      () => activeFilters.putIfAbsent(category, () => <String>{}).add(filter),
    );
    searchController.clear();
  }

  void removeFilter(String category, String filter) {
    setState(() {
      activeFilters[category]?.remove(filter);
      if (activeFilters[category]?.isEmpty ?? false) {
        activeFilters.remove(category);
      }
    });
  }

  String normalizeFilterText(String value) {
    return value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
  }

  bool textMatches(String source, String filter) {
    final sourceText = normalizeFilterText(source);
    final filterText = normalizeFilterText(filter);
    if (filterText.isEmpty) return true;
    if (sourceText.contains(filterText)) return true;

    final sourceNoVowels = sourceText.replaceAll(RegExp(r'[aeiou]'), '');
    final filterNoVowels = filterText.replaceAll(RegExp(r'[aeiou]'), '');
    return sourceNoVowels.contains(filterNoVowels);
  }

  String filterCategory(String filter) {
    final value = filter.toLowerCase().trim();
    final jobs = liveJobs.isEmpty ? fallbackJobs : liveJobs;

    if (value == 'it' || value == 'non-it' || value.contains('sector')) {
      return 'Sector';
    }
    if (RegExp(r'\b(lpa|ctc|salary|lakh|lakhs)\b').hasMatch(value)) {
      return 'Salary';
    }
    if (RegExp(r'\b(year|years|yr|yrs|experience|fresher)\b').hasMatch(value)) {
      return 'Experience';
    }
    if (RegExp(
      r'\b(full[ -]?time|part[ -]?time|contract|internship|remote|hybrid)\b',
    ).hasMatch(value)) {
      return 'Job type';
    }
    if (jobs.any((job) => textMatches(job.location, filter))) return 'Location';
    if (jobs.any((job) => textMatches(job.sector, filter))) return 'Sector';
    return 'Role';
  }

  bool matchesCategory(CandidateJob job, String category, String filter) {
    final normalized = filter.toLowerCase().trim();
    switch (category) {
      case 'Location':
        return textMatches(job.location, filter);
      case 'Salary':
        return textMatches(job.salary, filter);
      case 'Experience':
        return textMatches(job.experience, filter);
      case 'Job type':
        return textMatches(job.type, filter);
      case 'Sector':
        if (normalized == 'it') {
          return textMatches(job.sector, 'it') &&
              !textMatches(job.sector, 'non-it');
        }
        if (normalized == 'non-it') return textMatches(job.sector, 'non-it');
        return textMatches(job.sector, filter);
      default:
        return textMatches('${job.title} ${job.reason} ${job.summary}', filter);
    }
  }

  bool matchesActiveFilters(CandidateJob job) {
    if (activeFilters.isEmpty) return true;
    return activeFilters.entries.every(
      (group) =>
          group.value.any((filter) => matchesCategory(job, group.key, filter)),
    );
  }

  Future<void> loadLiveJobs() async {
    setState(() {
      loadingJobs = true;
      jobsError = '';
    });

    try {
      final jobs = await CandidateApi.loadJobs();
      if (!mounted) return;
      setState(() => liveJobs = jobs);
    } catch (error) {
      if (!mounted) return;
      setState(
        () => jobsError = error.toString().replaceFirst('Exception: ', ''),
      );
    } finally {
      if (mounted) {
        setState(() => loadingJobs = false);
      }
    }
  }

  List<CandidateJob> get fallbackJobs => const [
    CandidateJob(
      slug: 'regional-sales-manager',
      title: 'Regional Sales Manager',
      sector: 'Building Materials / Non-IT',
      location: 'Hyderabad / AP',
      salary: '10 - 14 LPA',
      experience: '6+ years',
      type: 'Full Time',
      match: '89% match',
      reason: 'Sales, regional network, salary range',
      summary:
          'Own regional sales growth, dealer relationships, and client follow-ups.',
      description: 'Full-time regional role for experienced sales candidates.',
      responsibilities: [
        'Manage regional pipeline',
        'Build dealer network',
        'Report sales progress',
      ],
      requirements: [
        '6+ years sales experience',
        'Strong AP/Telangana market knowledge',
      ],
      deadline: 'Apply soon',
    ),
    CandidateJob(
      slug: 'erp-manager',
      title: 'ERP Manager',
      sector: 'Education Technology / IT',
      location: 'Hyderabad',
      salary: '12 - 18 LPA',
      experience: '8+ years',
      type: 'Full Time',
      match: '92% match',
      reason: 'ERP, stakeholder management, location',
      summary: 'Lead ERP adoption, reporting, and process discipline.',
      description:
          'ERP operations role for candidates with implementation and MIS experience.',
      responsibilities: [
        'Own ERP delivery',
        'Coordinate stakeholders',
        'Improve reporting',
      ],
      requirements: [
        '8+ years ERP experience',
        'Process and reporting discipline',
      ],
      deadline: 'Apply soon',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final sourceJobs = liveJobs.isEmpty ? fallbackJobs : liveJobs;
    final jobsToShow = sourceJobs.where(matchesActiveFilters).toList();

    return ScreenFrame(
      eyebrow: 'Job Search',
      title: 'Find roles that match your profile',
      children: [
        SearchField(controller: searchController, onSubmitted: addSearchFilter),
        FilterSummaryCard(activeFilters: activeFilters, onRemove: removeFilter),
        const JobAlertsCard(),
        SectionHeader(
          title: liveJobs.isEmpty ? 'Recommended jobs' : 'Live jobs',
          action: loadingJobs
              ? 'Loading'
              : '${jobsToShow.length}/${sourceJobs.length}',
        ),
        if (jobsError.isNotEmpty)
          SyncStatusCard(
            title: 'Live jobs unavailable',
            message: '$jobsError. Showing recommended fallback jobs.',
            icon: Icons.cloud_off_outlined,
          ),
        ...jobsToShow.map(
          (job) => JobCard(
            slug: job.slug,
            title: job.title,
            sector: job.sector,
            location: job.location,
            salary: job.salary,
            experience: job.experience,
            type: job.type,
            match: job.match,
            reason: job.reason,
            summary: job.summary,
            description: job.description,
            responsibilities: job.responsibilities,
            requirements: job.requirements,
            deadline: job.deadline,
            saved: false,
            candidateSession: widget.candidateSession,
          ),
        ),
        const SavedJobsCard(),
        const ProfileMatchLogicCard(),
      ],
    );
  }
}

class ResumeScreen extends StatefulWidget {
  const ResumeScreen({super.key, required this.candidateSession});

  final CandidateSession candidateSession;

  @override
  State<ResumeScreen> createState() => _ResumeScreenState();
}

class _ResumeScreenState extends State<ResumeScreen> {
  final savedResumeCategories = <String>{};
  bool useProfileDetails = true;

  bool categoryComplete(String title) {
    final session = widget.candidateSession;
    if (savedResumeCategories.contains(title)) return true;
    if (!useProfileDetails) return false;
    return switch (title) {
      'Personal Information' => session.displayName != 'Candidate',
      'Skills & Achievements' => session.skills.isNotEmpty,
      'Experience' => session.profileText('experience', '').isNotEmpty,
      'Education' => session.profileText('education', '').isNotEmpty,
      _ => false,
    };
  }

  void markSaved(String title) {
    setState(() => savedResumeCategories.add(title));
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.candidateSession;
    final categories = [
      'Personal Information',
      'Skills & Achievements',
      'Experience',
      'Education',
    ];

    return ScreenFrame(
      eyebrow: 'Resume Builder',
      title: 'Build once, apply faster',
      children: [
        ResumeProgressCard(session: session),
        ResumeModeCard(
          useProfileDetails: useProfileDetails,
          onChanged: (value) => setState(() => useProfileDetails = value),
        ),
        ResumeQualityScoreCard(session: session),
        CardPanel(
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              TemplateChip(label: 'Executive', active: true),
              TemplateChip(label: 'Classic', active: false),
              TemplateChip(label: 'Modern', active: false),
              TemplateChip(label: 'Sidebar', active: false),
              TemplateChip(label: 'Compact', active: false),
            ],
          ),
        ),
        ...categories.map(
          (category) => ResumeStepTile(
            title: category,
            complete: categoryComplete(category),
            session: session,
            useProfileDetails: useProfileDetails,
            onSaved: () => markSaved(category),
          ),
        ),
        ResumePreviewCard(
          session: session,
          useProfileDetails: useProfileDetails,
        ),
        const ExportActionsCard(),
        const AiResumeCard(),
      ],
    );
  }
}

class ApplicationsScreen extends StatelessWidget {
  const ApplicationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenFrame(
      eyebrow: 'Applications',
      title: 'Track every job clearly',
      children: const [
        ApplicationTrackerCard(),
        ApplicationDetailCard(),
        ApplicationFiltersCard(),
        NextActionCard(),
        ApplicationListTile(
          title: 'Quality Control Specialist',
          status: 'Applied',
          meta: 'Vijayawada / 24 Jun',
        ),
        ApplicationListTile(
          title: 'Regional Sales Manager',
          status: 'Shortlisted',
          meta: 'Hyderabad / 22 Jun',
        ),
        PreparationCard(),
        RecruiterChatCard(),
        InterviewCalendarCard(),
        RoadmapCard(),
      ],
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.darkMode,
    required this.candidateSession,
    required this.onDarkModeChanged,
    required this.onCandidateSessionChanged,
  });

  final bool darkMode;
  final CandidateSession? candidateSession;
  final ValueChanged<bool> onDarkModeChanged;
  final ValueChanged<CandidateSession?> onCandidateSessionChanged;

  @override
  Widget build(BuildContext context) {
    final session = candidateSession!;
    return ScreenFrame(
      eyebrow: 'Smart Profile',
      title: 'Your candidate profile',
      children: [
        CandidateSummaryCard(session: session),
        ProfileSectionCard(
          title: 'Personal details',
          icon: Icons.person_outline,
          items: [
            session.displayName,
            session.email,
            session.phone.isNotEmpty ? session.phone : 'Phone pending',
          ],
          onTap: () => openProfileEditor(
            context,
            title: 'Personal details',
            session: session,
            fields: const [
              ProfileField('Full name', 'fullName'),
              ProfileField('Email', 'email'),
              ProfileField('Phone', 'phone'),
              ProfileField('Current location', 'currentLocation'),
            ],
            onUpdated: onCandidateSessionChanged,
          ),
        ),
        ProfileSectionCard(
          title: 'Education',
          icon: Icons.school_outlined,
          items: [
            session.profileText('education', 'Education pending'),
          ],
          onTap: () => openProfileEditor(
            context,
            title: 'Education',
            session: session,
            fields: const [ProfileField('Education', 'education', lines: 4)],
            onUpdated: onCandidateSessionChanged,
          ),
        ),
        ProfileSectionCard(
          title: 'Experience',
          icon: Icons.badge_outlined,
          items: [
            session.profileText('experience', 'Experience pending'),
            session.profileText('preferredRole', 'Preferred role pending'),
            session.profileText('currentCtc', 'Current CTC pending'),
          ],
          onTap: () => openProfileEditor(
            context,
            title: 'Experience',
            session: session,
            fields: const [
              ProfileField('Experience', 'experience', lines: 4),
              ProfileField('Preferred role', 'preferredRole'),
              ProfileField('Current CTC', 'currentCtc'),
            ],
            onUpdated: onCandidateSessionChanged,
          ),
        ),
        ProfileSectionCard(
          title: 'Preferences',
          icon: Icons.tune_outlined,
          items: [
            'Preferred role: ${session.profileText('preferredRole', 'Pending')}',
            'Expected CTC: ${session.profileText('expectedCtc', 'Pending')}',
            'Notice period: ${session.profileText('noticePeriod', 'Pending')}',
            'Location: ${session.profileText('preferredLocation', 'Pending')}',
          ],
          onTap: () => openProfileEditor(
            context,
            title: 'Preferences',
            session: session,
            fields: const [
              ProfileField('Preferred roles', 'preferredRole'),
              ProfileField('Expected CTC', 'expectedCtc'),
              ProfileField('Notice period', 'noticePeriod'),
              ProfileField('Preferred locations', 'preferredLocation'),
              ProfileField('Preferred sector', 'preferredSector'),
            ],
            onUpdated: onCandidateSessionChanged,
          ),
        ),
        SkillsCard(
          session: session,
          onUpdated: onCandidateSessionChanged,
        ),
        DocumentCenterCard(
          session: session,
          onUpdated: onCandidateSessionChanged,
        ),
        DocumentUploadFlowCard(
          session: session,
          onUpdated: onCandidateSessionChanged,
        ),
        const OfflineDraftCard(),
        ShareCard(session: session),
        SettingsPreviewCard(
          darkMode: darkMode,
          onDarkModeChanged: onDarkModeChanged,
        ),
        CandidateAnalyticsCard(session: session),
      ],
    );
  }
}

class ScreenFrame extends StatelessWidget {
  const ScreenFrame({
    super.key,
    required this.title,
    required this.eyebrow,
    required this.children,
    this.trailing,
  });

  final String title;
  final String eyebrow;
  final List<Widget> children;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        eyebrow.toUpperCase(),
                        style: TextStyle(
                          color: colors.primary,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w400,
                          letterSpacing: 1.7,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        title,
                        style: TextStyle(
                          color: colors.onSurface,
                          fontSize: 25,
                          height: 1.08,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          sliver: SliverList.separated(
            itemCount: children.length,
            separatorBuilder: (_, _) => const SizedBox(height: 14),
            itemBuilder: (context, index) => children[index],
          ),
        ),
      ],
    );
  }
}

class CandidateLoginCard extends StatefulWidget {
  const CandidateLoginCard({
    super.key,
    required this.session,
    required this.onSessionChanged,
  });

  final CandidateSession? session;
  final ValueChanged<CandidateSession?> onSessionChanged;

  @override
  State<CandidateLoginCard> createState() => _CandidateLoginCardState();
}

class _CandidateLoginCardState extends State<CandidateLoginCard> {
  final emailController = TextEditingController(text: 'djkreddys@gmail.com');
  final passwordController = TextEditingController(text: 'password123');
  bool loading = false;
  String message = '';

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> runAuth(Future<CandidateSession> Function() action) async {
    setState(() {
      loading = true;
      message = '';
    });

    try {
      final session = await action();
      widget.onSessionChanged(session);
      setState(() => message = 'Connected to Railway backend.');
    } catch (error) {
      setState(() => message = _friendlyAuthMessage(error));
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  String _friendlyAuthMessage(Object error) {
    final raw = error.toString().replaceFirst('Exception: ', '');
    final lower = raw.toLowerCase();
    if (lower.contains('failed to fetch') ||
        lower.contains('connection refused') ||
        lower.contains('xmlhttprequest error') ||
        raw.contains(CandidateApi.baseUrl)) {
      return 'Candidate backend is not connected. Please start Railway backend or set the live API URL.';
    }
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Login details'),
          const SizedBox(height: 12),
          if (session != null) ...[
            MiniRow(
              icon: Icons.verified_user_outlined,
              title: session.displayName,
              subtitle: session.email.isEmpty
                  ? 'Candidate token active'
                  : session.email,
            ),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: loading
                        ? null
                        : () async {
                            await runAuth(
                              () => CandidateApi.login(
                                identifier: emailController.text.trim(),
                                password: passwordController.text,
                              ),
                            );
                          },
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Refresh login'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: loading
                        ? null
                        : () => widget.onSessionChanged(null),
                    icon: const Icon(Icons.logout, size: 18),
                    label: const Text('Logout'),
                  ),
                ),
              ],
            ),
          ] else ...[
            TextField(
              controller: emailController,
              decoration: const InputDecoration(
                labelText: 'Username',
                prefixIcon: Icon(Icons.alternate_email),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: loading
                        ? null
                        : () => runAuth(
                            () => CandidateApi.register(
                              fullName: _nameFromUsername(
                                emailController.text.trim(),
                              ),
                              email: emailController.text.trim(),
                              phone: '',
                              password: passwordController.text,
                            ),
                          ),
                    icon: const Icon(Icons.person_add_alt_1, size: 18),
                    label: const Text('Register'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: loading
                        ? null
                        : () => runAuth(
                            () => CandidateApi.login(
                              identifier: emailController.text.trim(),
                              password: passwordController.text,
                            ),
                          ),
                    icon: const Icon(Icons.login, size: 18),
                    label: const Text('Login'),
                  ),
                ),
              ],
            ),
          ],
          if (loading) ...[
            const SizedBox(height: 10),
            const LinearProgressIndicator(),
          ],
          if (message.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              message,
              style: TextStyle(
                color: message.contains('Connected')
                    ? AppColors.brand
                    : AppColors.accentStrong,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _nameFromUsername(String value) {
    final username = value.split('@').first.trim();
    if (username.isEmpty) return 'Werkly Candidate';
    return username
        .split(RegExp(r'[._\-\s]+'))
        .where((part) => part.isNotEmpty)
        .map((part) => part[0].toUpperCase() + part.substring(1))
        .join(' ');
  }
}

class MobileEnhancementRoadmapCard extends StatelessWidget {
  const MobileEnhancementRoadmapCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Mobile enhancements', action: 'Candidate only'),
          SizedBox(height: 12),
          EnhancementGroup(
            title: 'High priority',
            color: AppColors.accentStrong,
            items: [
              'Railway login/register',
              'Profile edit/save sync',
              'Resume upload/download',
              'Live werkly.in jobs',
              'Job detail + one-tap apply',
              'Saved jobs sync',
              'Application tracking',
              'Notifications center',
              'Offline drafts',
              'Push setup',
            ],
          ),
          SizedBox(height: 12),
          EnhancementGroup(
            title: 'Good UX updates',
            color: AppColors.brand,
            items: [
              'Better onboarding',
              'Profile checklist',
              'Resume quality score',
              'Job match explanation',
              'Filter chips',
              'Document center',
              'WhatsApp/email share',
              'Dark mode',
              'Telugu/Hindi later',
            ],
          ),
          SizedBox(height: 12),
          EnhancementGroup(
            title: 'Advanced later',
            color: AppColors.muted,
            items: [
              'AI resume assistant',
              'Interview prep',
              'Video intro profile',
              'Referral jobs',
              'Candidate analytics',
            ],
          ),
        ],
      ),
    );
  }
}

class EnhancementGroup extends StatelessWidget {
  const EnhancementGroup({
    super.key,
    required this.title,
    required this.color,
    required this.items,
  });

  final String title;
  final Color color;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StatusPill(label: title, color: color),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: items.map((item) => InfoPill(item)).toList(),
        ),
      ],
    );
  }
}

class LiveJobsApiCard extends StatelessWidget {
  const LiveJobsApiCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.public_outlined,
      title: 'Live werkly.in jobs API',
      description:
          'Next implementation pass should load job listings from the live web jobs API and keep filters synced with role, location, salary, sector, IT/Non-IT, experience, and job type.',
    );
  }
}

class ResumeBackendSyncCard extends StatelessWidget {
  const ResumeBackendSyncCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.cloud_upload_outlined,
      title: 'Resume document sync',
      description:
          'Wire resume upload, preview, PDF/Word download, and document storage to the Railway candidate profile endpoints.',
    );
  }
}

class ProfileBackendSyncCard extends StatelessWidget {
  const ProfileBackendSyncCard({super.key, required this.session});

  final CandidateSession? session;

  @override
  Widget build(BuildContext context) {
    final connected = session != null;

    return CardPanel(
      color: connected
          ? AppColors.brand.withValues(alpha: 0.10)
          : AppColors.accent.withValues(alpha: 0.18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Profile backend sync',
            action: connected ? 'Connected' : 'Pending login',
          ),
          const SizedBox(height: 10),
          MiniRow(
            icon: connected
                ? Icons.verified_user_outlined
                : Icons.sync_problem_outlined,
            title: connected
                ? 'Railway candidate session active'
                : 'Login/register first',
            subtitle: connected
                ? 'Next: save profile edits, resume docs, saved jobs, and applications against this account.'
                : 'Use the Home login card to connect this mobile profile to Railway.',
          ),
          const MiniRow(
            icon: Icons.save_outlined,
            title: 'Offline draft saving',
            subtitle:
                'Profile and resume edits should stay local first, then sync after network returns.',
          ),
        ],
      ),
    );
  }
}

class OnboardingFlowCard extends StatelessWidget {
  const OnboardingFlowCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Personal info', session.displayName != 'Candidate'),
      ('Experience', session.profileText('experience', '').isNotEmpty),
      ('Skills', session.skills.isNotEmpty),
      ('Preferred role', session.profileText('preferredRole', '').isNotEmpty),
      ('Expected CTC', session.profileText('expectedCtc', '').isNotEmpty),
      ('Notice period', session.profileText('noticePeriod', '').isNotEmpty),
      ('Location', session.profileText('preferredLocation', '').isNotEmpty),
    ];

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Candidate onboarding'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items
                .map((item) => InfoPill(item.$2 ? '${item.$1} done' : item.$1))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class ProfileCompletionChecklistCard extends StatelessWidget {
  const ProfileCompletionChecklistCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    final checks = [
      (
        Icons.description_outlined,
        'Resume ${session.profileText('resumeFileName', '').isEmpty ? 'pending' : 'added'}',
        session.profileText(
          'resumeFileName',
          'Upload existing resume or build one',
        ),
      ),
      (
        Icons.school_outlined,
        'Education ${session.profileText('education', '').isEmpty ? 'pending' : 'added'}',
        session.profileText('education', 'Add latest qualification details'),
      ),
      (
        Icons.workspace_premium_outlined,
        'Skills ${session.skills.isEmpty ? 'pending' : 'added'}',
        session.skills.isEmpty
            ? 'Add role skills'
            : session.skills.take(3).join(', '),
      ),
      (
        Icons.payments_outlined,
        'Expected CTC ${session.profileText('expectedCtc', '').isEmpty ? 'pending' : 'added'}',
        session.profileText('expectedCtc', 'Add expected CTC'),
      ),
      (
        Icons.place_outlined,
        'Preferred location ${session.profileText('preferredLocation', '').isEmpty ? 'pending' : 'added'}',
        session.profileText('preferredLocation', 'Add preferred location'),
      ),
    ];
    final done = checks.where((item) => !item.$2.contains('pending')).length;

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Profile checklist',
            action: '$done/${checks.length} done',
          ),
          const SizedBox(height: 10),
          ...checks.map(
            (item) => MiniRow(icon: item.$1, title: item.$2, subtitle: item.$3),
          ),
        ],
      ),
    );
  }
}

class JobAlertsCard extends StatelessWidget {
  const JobAlertsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.add_alert_outlined,
      title: 'Job alert',
      description:
          'ERP Manager in Hyderabad above 12 LPA, full-time roles only.',
    );
  }
}

class JobDetailCard extends StatelessWidget {
  const JobDetailCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Job detail page'),
          SizedBox(height: 10),
          Text(
            'ERP Manager',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w400),
          ),
          SizedBox(height: 6),
          Text(
            'Education Technology / Hyderabad / 12 - 18 LPA',
            style: TextStyle(color: AppColors.muted),
          ),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.task_alt_outlined,
            title: 'Responsibilities',
            subtitle:
                'Own ERP delivery, adoption, reporting, and stakeholder alignment',
          ),
          MiniRow(
            icon: Icons.rule_outlined,
            title: 'Requirements',
            subtitle: '8+ years ERP operations and process discipline',
          ),
          MiniRow(
            icon: Icons.event_outlined,
            title: 'Deadline',
            subtitle: 'Apply before 30 Jun',
          ),
        ],
      ),
    );
  }
}

class ApplyConfirmationCard extends StatelessWidget {
  const ApplyConfirmationCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      color: Color(0xFFFFE8C2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Apply confirmation'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.description_outlined,
            title: 'Selected resume',
            subtitle: 'Jaswanth_Reddy_Resume.pdf',
          ),
          MiniRow(
            icon: Icons.payments_outlined,
            title: 'Expected CTC',
            subtitle: '15 LPA',
          ),
          MiniRow(
            icon: Icons.schedule_outlined,
            title: 'Notice period',
            subtitle: '30 days',
          ),
          SizedBox(height: 8),
          Text(
            'Confirm profile and resume before one-tap apply.',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class ProfileMatchLogicCard extends StatelessWidget {
  const ProfileMatchLogicCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Profile match logic'),
          SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              InfoPill('Skills +32'),
              InfoPill('Location +18'),
              InfoPill('Experience +20'),
              InfoPill('Salary +12'),
              InfoPill('Sector +10'),
            ],
          ),
        ],
      ),
    );
  }
}

class ResumeQualityScoreCard extends StatelessWidget {
  const ResumeQualityScoreCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    final score = session.profileCompletion.clamp(0, 100);
    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Resume quality score', action: '$score%'),
          const SizedBox(height: 10),
          ProgressBar(value: score / 100),
          const SizedBox(height: 10),
          const MiniRow(
            icon: Icons.subject_outlined,
            title: 'Summary',
            subtitle: 'Add stronger target-role keywords',
          ),
          const MiniRow(
            icon: Icons.insights_outlined,
            title: 'Metrics',
            subtitle: 'Add measurable achievements',
          ),
          MiniRow(
            icon: Icons.workspace_premium_outlined,
            title: 'Skills',
            subtitle: session.skills.isEmpty
                ? 'Add tools and certifications'
                : session.skills.take(4).join(', '),
          ),
        ],
      ),
    );
  }
}

class ApplicationDetailCard extends StatelessWidget {
  const ApplicationDetailCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Application detail'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.work_outline,
            title: 'ERP Manager',
            subtitle: 'Interview stage / Hyderabad',
          ),
          MiniRow(
            icon: Icons.message_outlined,
            title: 'Recruiter message',
            subtitle: 'Please confirm interview availability.',
          ),
          MiniRow(
            icon: Icons.notes_outlined,
            title: 'Notes',
            subtitle: 'Carry updated resume and salary details',
          ),
          MiniRow(
            icon: Icons.next_plan_outlined,
            title: 'Next action',
            subtitle: 'Join online interview tomorrow at 11:30 AM',
          ),
        ],
      ),
    );
  }
}

class ApplicationFiltersCard extends StatelessWidget {
  const ApplicationFiltersCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          InfoPill('Applied'),
          InfoPill('Interview'),
          InfoPill('Offered'),
          InfoPill('Rejected'),
          InfoPill('Joined'),
        ],
      ),
    );
  }
}

class RecruiterChatCard extends StatelessWidget {
  const RecruiterChatCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Recruiter chat'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.support_agent_outlined,
            title: 'Werkly recruiter',
            subtitle: 'Interview link will be shared by 7 PM.',
          ),
          MiniRow(
            icon: Icons.reply_outlined,
            title: 'Candidate reply',
            subtitle: 'Available tomorrow at 11:30 AM.',
          ),
        ],
      ),
    );
  }
}

class InterviewCalendarCard extends StatelessWidget {
  const InterviewCalendarCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Interview calendar'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.calendar_month_outlined,
            title: 'Tomorrow, 11:30 AM',
            subtitle: 'Online / ERP Manager / reminder enabled',
          ),
          MiniRow(
            icon: Icons.link_outlined,
            title: 'Meeting link',
            subtitle: 'Will appear once recruiter confirms',
          ),
        ],
      ),
    );
  }
}

class DocumentUploadFlowCard extends StatelessWidget {
  const DocumentUploadFlowCard({
    super.key,
    required this.session,
    required this.onUpdated,
  });

  final CandidateSession session;
  final ValueChanged<CandidateSession?> onUpdated;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DocumentUploadScreen(
            session: session,
            onUpdated: onUpdated,
          ),
        ),
      ),
      child: const CardPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LabelText('Document upload flow'),
            SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                InfoPill('Resume'),
                InfoPill('Certificates'),
                InfoPill('ID proof'),
                InfoPill('Offer letter'),
                InfoPill('Experience letter'),
              ],
            ),
            SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Icon(Icons.chevron_right, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class CandidateAnalyticsCard extends StatelessWidget {
  const CandidateAnalyticsCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => CandidateAnalyticsScreen(session: session),
        ),
      ),
      child: CardPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const LabelText('Candidate analytics'),
            const SizedBox(height: 10),
            MiniRow(
              icon: Icons.account_circle_outlined,
              title: 'Profile completion',
              subtitle: '${session.profileCompletion}% from your live profile',
            ),
            const MiniRow(
              icon: Icons.analytics_outlined,
              title: 'Open live analytics',
              subtitle: 'Applications and shortlist rate from Railway',
            ),
            const Align(
              alignment: Alignment.centerRight,
              child: Icon(Icons.chevron_right, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class HelpSupportCard extends StatelessWidget {
  const HelpSupportCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Help and support'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.help_outline,
            title: 'FAQ',
            subtitle: 'How applications, resumes, and alerts work',
          ),
          MiniRow(
            icon: Icons.call_outlined,
            title: 'Contact Werkly',
            subtitle: 'Call, email, or report an issue',
          ),
        ],
      ),
    );
  }
}

class ProfileStrengthCard extends StatelessWidget {
  const ProfileStrengthCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    final completion = session.profileCompletion.clamp(0, 100);
    final missing = <String>[
      if (session.profileText('resumeFileName', '').isEmpty) 'resume',
      if (session.profileText('education', '').isEmpty) 'education',
      if (session.skills.isEmpty) 'skills',
      if (session.profileText('expectedCtc', '').isEmpty) 'expected CTC',
      if (session.profileText('noticePeriod', '').isEmpty) 'notice period',
    ];
    final hint = missing.isEmpty
        ? 'Profile is ready for matching and one-tap apply.'
        : 'Add ${missing.take(2).join(' and ')} to improve matches.';

    return CardPanel(
      color: AppColors.brand,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Profile strength', onDark: true),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$completion%',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 38,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hint,
                      style: const TextStyle(
                        color: Colors.white70,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: AppColors.ink,
                ),
                onPressed: () {},
                child: const Text('Complete'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ProgressBar(value: completion / 100, onDark: true),
        ],
      ),
    );
  }
}

class MetricStrip extends StatelessWidget {
  const MetricStrip({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: StatTile(
            value: session.profileText('resumeFileName', '').isEmpty
                ? '0'
                : '1',
            label: 'Resumes',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: StatTile(
            value: session.skills.length.toString(),
            label: 'Skills',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: StatTile(
            value: '${session.profileCompletion}%',
            label: 'Profile',
          ),
        ),
      ],
    );
  }
}

class QuickActionGrid extends StatelessWidget {
  const QuickActionGrid({super.key});

  @override
  Widget build(BuildContext context) {
    const actions = [
      (Icons.person_add_alt_1_outlined, 'Complete profile'),
      (Icons.description_outlined, 'Build resume'),
      (Icons.touch_app_outlined, 'Apply jobs'),
      (Icons.event_available_outlined, 'Upcoming interview'),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 10.0;
        final availableWidth = constraints.maxWidth;
        final columns = availableWidth >= 760
            ? 4
            : availableWidth >= 320
            ? 2
            : 1;
        final cardWidth =
            (availableWidth - (spacing * (columns - 1))) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: actions
              .map(
                (item) => SizedBox(
                  width: cardWidth,
                  height: 78,
                  child: CardPanel(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Icon(
                          item.$1,
                          size: 21,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            item.$2,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.2,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class SearchField extends StatelessWidget {
  const SearchField({
    super.key,
    required this.controller,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textInputAction: TextInputAction.search,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        hintText: 'Type role, location, salary, sector and press Enter',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

class JobFilterChips extends StatelessWidget {
  const JobFilterChips({
    super.key,
    required this.filters,
    required this.activeFilters,
    required this.onToggle,
    required this.onRemove,
    required this.onAdd,
  });

  final List<String> filters;
  final Set<String> activeFilters;
  final ValueChanged<String> onToggle;
  final ValueChanged<String> onRemove;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        ...filters.map(
          (filter) => InputChip(
            selected: activeFilters.contains(filter),
            avatar: filter == 'All' && activeFilters.contains(filter)
                ? const Icon(Icons.check, size: 16)
                : null,
            label: Text(filter),
            onPressed: () => onToggle(filter),
            onDeleted: filter == 'All' ? null : () => onRemove(filter),
            deleteIcon: const Icon(Icons.close, size: 16),
            tooltip: 'Use $filter filter',
            deleteButtonTooltipMessage: 'Remove $filter filter',
          ),
        ),
        ActionChip(
          avatar: const Icon(Icons.add, size: 18),
          label: const Text('Add filter'),
          onPressed: onAdd,
        ),
      ],
    );
  }
}

class LiveJobsRefreshCard extends StatelessWidget {
  const LiveJobsRefreshCard({
    super.key,
    required this.loading,
    required this.usingLiveData,
    required this.onRefresh,
  });

  final bool loading;
  final bool usingLiveData;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Icon(
            usingLiveData
                ? Icons.cloud_done_outlined
                : Icons.cloud_off_outlined,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              usingLiveData
                  ? 'Showing live Railway jobs'
                  : 'Showing fallback jobs',
              style: const TextStyle(color: AppColors.muted),
            ),
          ),
          TextButton.icon(
            onPressed: loading ? null : onRefresh,
            icon: loading
                ? const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh, size: 18),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
}

class FilterSummaryCard extends StatelessWidget {
  const FilterSummaryCard({
    super.key,
    required this.activeFilters,
    required this.onRemove,
  });

  final Map<String, Set<String>> activeFilters;
  final void Function(String category, String filter) onRemove;

  @override
  Widget build(BuildContext context) {
    final shownFilters = activeFilters.entries
        .expand((group) => group.value.map((value) => (group.key, value)))
        .toList();

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Filters'),
          const SizedBox(height: 10),
          if (shownFilters.isEmpty)
            const Text(
              'No filters added. Showing all live jobs.',
              style: TextStyle(color: AppColors.muted),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: shownFilters
                  .map(
                    (filter) => InputChip(
                      label: Text('${filter.$1}: ${filter.$2}'),
                      onDeleted: () => onRemove(filter.$1, filter.$2),
                      deleteIcon: const Icon(Icons.close, size: 16),
                      deleteButtonTooltipMessage: 'Remove ${filter.$2} filter',
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }
}

class JobCard extends StatelessWidget {
  const JobCard({
    super.key,
    required this.slug,
    required this.title,
    required this.sector,
    required this.location,
    required this.salary,
    required this.experience,
    required this.type,
    required this.match,
    required this.reason,
    required this.summary,
    required this.description,
    required this.responsibilities,
    required this.requirements,
    required this.deadline,
    required this.saved,
    required this.candidateSession,
  });

  final String slug;
  final String title;
  final String sector;
  final String location;
  final String salary;
  final String experience;
  final String type;
  final String match;
  final String reason;
  final String summary;
  final String description;
  final List<String> responsibilities;
  final List<String> requirements;
  final String deadline;
  final bool saved;
  final CandidateSession candidateSession;

  void showDetails(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => JobDetailScreen(
          slug: slug,
          title: title,
          sector: sector,
          location: location,
          salary: salary,
          experience: experience,
          type: type,
          summary: summary,
          description: description,
          responsibilities: responsibilities,
          requirements: requirements,
          deadline: deadline,
          candidateSession: candidateSession,
        ),
      ),
    );
  }

  void shareJob(BuildContext context) {
    SharePlus.instance.share(
      ShareParams(
        subject: '$title at Werkly',
        text:
            '$title\n$sector\n$location | $salary | $experience\nhttps://www.werkly.in/jobs/$slug',
      ),
    );
  }

  void applyJob(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ApplyConfirmationScreen(
          jobTitle: title,
          candidateSession: candidateSession,
        ),
      ),
    );
  }

  Widget jobActionsMenu(BuildContext context) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert),
      tooltip: 'Job actions',
      onSelected: (value) {
        if (value == 'details') showDetails(context);
        if (value == 'apply') applyJob(context);
        if (value == 'share') shareJob(context);
      },
      itemBuilder: (context) => const [
        PopupMenuItem(
          value: 'details',
          child: ListTile(
            dense: true,
            leading: Icon(Icons.visibility_outlined),
            title: Text('Details'),
          ),
        ),
        PopupMenuItem(
          value: 'apply',
          child: ListTile(
            dense: true,
            leading: Icon(Icons.touch_app_outlined),
            title: Text('Apply'),
          ),
        ),
        PopupMenuItem(
          value: 'share',
          child: ListTile(
            dense: true,
            leading: Icon(Icons.share_outlined),
            title: Text('Share'),
          ),
        ),
      ],
    );
  }

  Widget inlineJobActions(BuildContext context) {
    final compactStyle = OutlinedButton.styleFrom(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      minimumSize: const Size(0, 40),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
    final compactFilledStyle = FilledButton.styleFrom(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      minimumSize: const Size(0, 40),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            style: compactStyle,
            onPressed: () => showDetails(context),
            icon: const Icon(Icons.visibility_outlined, size: 18),
            label: const Text('Details'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilledButton.icon(
            style: compactFilledStyle,
            onPressed: () => applyJob(context),
            icon: const Icon(Icons.touch_app_outlined, size: 18),
            label: const Text('Apply'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            style: compactStyle,
            onPressed: () => shareJob(context),
            icon: const Icon(Icons.share_outlined, size: 18),
            label: const Text('Share'),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final showInlineActions = MediaQuery.sizeOf(context).width >= 400;

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      sector,
                      style: const TextStyle(color: AppColors.muted),
                    ),
                  ],
                ),
              ),
              if (!showInlineActions) jobActionsMenu(context),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              InfoPill(location),
              InfoPill(salary),
              InfoPill(experience),
              InfoPill(type),
            ],
          ),
          const SizedBox(height: 12),
          MatchReason(match: match, reason: reason),
          if (showInlineActions) ...[
            const SizedBox(height: 14),
            inlineJobActions(context),
          ],
        ],
      ),
    );
  }
}

class JobDetailScreen extends StatefulWidget {
  const JobDetailScreen({
    super.key,
    required this.slug,
    required this.title,
    required this.sector,
    required this.location,
    required this.salary,
    required this.experience,
    required this.type,
    required this.summary,
    required this.description,
    required this.responsibilities,
    required this.requirements,
    required this.deadline,
    required this.candidateSession,
  });

  final String slug;
  final String title;
  final String sector;
  final String location;
  final String salary;
  final String experience;
  final String type;
  final String summary;
  final String description;
  final List<String> responsibilities;
  final List<String> requirements;
  final String deadline;
  final CandidateSession candidateSession;

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  final scrollController = ScrollController();

  @override
  void dispose() {
    scrollController.dispose();
    super.dispose();
  }

  void applyJob() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ApplyConfirmationScreen(
          jobTitle: widget.title,
          candidateSession: widget.candidateSession,
        ),
      ),
    );
  }

  void shareJob() {
    SharePlus.instance.share(
      ShareParams(
        subject: '${widget.title} at Werkly',
        text:
            '${widget.title}\n${widget.sector}\n${widget.location} | ${widget.salary} | ${widget.experience}\nhttps://www.werkly.in/jobs/${widget.slug}',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final detailsText = widget.summary.isEmpty
        ? widget.description
        : widget.summary;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        title: const Text('Job details'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Scrollbar(
                controller: scrollController,
                thumbVisibility: true,
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: const TextStyle(
                          fontSize: 24,
                          height: 1.15,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${widget.sector} / ${widget.location}',
                        style: const TextStyle(color: AppColors.muted),
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          InfoPill(widget.salary),
                          InfoPill(widget.experience),
                          InfoPill(widget.type),
                          if (widget.deadline.isNotEmpty)
                            InfoPill('Deadline: ${widget.deadline}'),
                        ],
                      ),
                      if (detailsText.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        Text(detailsText, style: const TextStyle(height: 1.42)),
                      ],
                      if (widget.responsibilities.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        const LabelText('Responsibilities'),
                        const SizedBox(height: 10),
                        ...widget.responsibilities.map(
                          (item) => MiniRow(
                            icon: Icons.task_alt_outlined,
                            title: item,
                            subtitle: '',
                          ),
                        ),
                      ],
                      if (widget.requirements.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        const LabelText('Requirements'),
                        const SizedBox(height: 10),
                        ...widget.requirements.map(
                          (item) => MiniRow(
                            icon: Icons.rule_outlined,
                            title: item,
                            subtitle: '',
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: shareJob,
                      icon: const Icon(Icons.share_outlined, size: 18),
                      label: const Text('Share'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: applyJob,
                      icon: const Icon(Icons.touch_app_outlined, size: 18),
                      label: const Text('Apply'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ApplyConfirmationScreen extends StatefulWidget {
  const ApplyConfirmationScreen({
    super.key,
    required this.jobTitle,
    required this.candidateSession,
  });

  final String jobTitle;
  final CandidateSession candidateSession;

  @override
  State<ApplyConfirmationScreen> createState() =>
      _ApplyConfirmationScreenState();
}

class _ApplyConfirmationScreenState extends State<ApplyConfirmationScreen> {
  late final TextEditingController expectedCtcController;
  late final TextEditingController noticeController;
  late final TextEditingController resumeController;
  late final TextEditingController noteController;

  @override
  void initState() {
    super.initState();
    expectedCtcController = TextEditingController(
      text: widget.candidateSession.profileText('expectedCtc', ''),
    );
    noticeController = TextEditingController(
      text: widget.candidateSession.profileText('noticePeriod', ''),
    );
    resumeController = TextEditingController(
      text: widget.candidateSession.profileText(
        'resumeFileName',
        '${widget.candidateSession.displayName.replaceAll(' ', '_')}_Resume.pdf',
      ),
    );
    noteController = TextEditingController();
  }

  @override
  void dispose() {
    expectedCtcController.dispose();
    noticeController.dispose();
    resumeController.dispose();
    noteController.dispose();
    super.dispose();
  }

  void confirmApply() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Application submitted for ${widget.jobTitle}')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        title: const Text('Apply confirmation'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CardPanel(
                      color: AppColors.brand,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const LabelText('One-tap apply', onDark: true),
                          const SizedBox(height: 8),
                          Text(
                            widget.jobTitle,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 21,
                              height: 1.2,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.candidateSession.displayName,
                            style: const TextStyle(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    CardPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const LabelText('Resume selected'),
                          const SizedBox(height: 12),
                          TextField(
                            controller: resumeController,
                            decoration: const InputDecoration(
                              labelText: 'Resume file',
                              prefixIcon: Icon(Icons.description_outlined),
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.paper,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.line),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.candidateSession.displayName,
                                  style: const TextStyle(fontSize: 16),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.candidateSession.profileText(
                                    'preferredRole',
                                    'Preferred role pending',
                                  ),
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  widget.candidateSession.skills.isEmpty
                                      ? 'Skills pending'
                                      : widget.candidateSession.skills
                                            .take(5)
                                            .join(', '),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    CardPanel(
                      child: Column(
                        children: [
                          TextField(
                            controller: expectedCtcController,
                            decoration: const InputDecoration(
                              labelText: 'Expected CTC',
                              prefixIcon: Icon(Icons.payments_outlined),
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: noticeController,
                            decoration: const InputDecoration(
                              labelText: 'Notice period',
                              prefixIcon: Icon(Icons.schedule_outlined),
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: noteController,
                            minLines: 3,
                            maxLines: 5,
                            decoration: const InputDecoration(
                              labelText: 'Note to recruiter',
                              prefixIcon: Icon(Icons.edit_note_outlined),
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: confirmApply,
                  icon: const Icon(Icons.task_alt_outlined, size: 18),
                  label: const Text('Confirm apply'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MatchReason extends StatelessWidget {
  const MatchReason({super.key, required this.match, required this.reason});

  final String match;
  final String reason;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          StatusPill(label: match, color: AppColors.brand),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              reason,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SavedJobsCard extends StatelessWidget {
  const SavedJobsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Saved jobs'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.bookmark,
            title: '12 saved jobs',
            subtitle: 'Apply later from your shortlist',
          ),
          MiniRow(
            icon: Icons.schedule,
            title: '3 closing soon',
            subtitle: 'Last date within 7 days',
          ),
        ],
      ),
    );
  }
}

class ResumeProgressCard extends StatelessWidget {
  const ResumeProgressCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    final completion = session.profileCompletion.clamp(0, 100);
    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Resume completion', action: '$completion%'),
          const SizedBox(height: 10),
          ProgressBar(value: completion / 100),
          const SizedBox(height: 10),
          Text(
            session.profileText('resumeFileName', '').isEmpty
                ? 'Upload existing resume or continue step-by-step builder.'
                : '${session.profileText('resumeFileName')} is linked to this profile.',
          ),
        ],
      ),
    );
  }
}

class ResumeModeCard extends StatelessWidget {
  const ResumeModeCard({
    super.key,
    required this.useProfileDetails,
    required this.onChanged,
  });

  final bool useProfileDetails;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'Resume mode'),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: useProfileDetails,
            onChanged: (_) => onChanged(true),
            title: const Text('Use my profile details'),
            subtitle: const Text(
              'Prefill resume fields from my candidate profile.',
            ),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: !useProfileDetails,
            onChanged: (_) => onChanged(false),
            title: const Text('Talent Draft'),
            subtitle: const Text(
              'Create a resume for another person without using your profile details.',
            ),
            controlAffinity: ListTileControlAffinity.leading,
          ),
        ],
      ),
    );
  }
}

class TemplateChip extends StatelessWidget {
  const TemplateChip({super.key, required this.label, required this.active});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(selected: active, label: Text(label));
  }
}

class ResumeStepTile extends StatelessWidget {
  const ResumeStepTile({
    super.key,
    required this.title,
    required this.complete,
    required this.session,
    required this.useProfileDetails,
    required this.onSaved,
  });

  final String title;
  final bool complete;
  final CandidateSession session;
  final bool useProfileDetails;
  final VoidCallback onSaved;

  String profileValue(String key, [String fallback = '']) {
    return useProfileDetails ? session.profileText(key, fallback) : '';
  }

  String get profileName => useProfileDetails ? session.displayName : '';
  String get profileEmail => useProfileDetails ? session.email : '';
  String get profilePhone => useProfileDetails ? session.phone : '';
  List<String> get profileSkills =>
      useProfileDetails ? session.skills : const [];

  List<ResumeFieldSpec> get fields {
    return switch (title) {
      'Personal Information' => [
        ResumeFieldSpec('Full Name', profileName),
        ResumeFieldSpec('Email', profileEmail),
        ResumeFieldSpec('Phone', profilePhone),
        const ResumeFieldSpec('Alternative Number', ''),
        ResumeFieldSpec('Location', profileValue('currentLocation')),
        const ResumeFieldSpec('LinkedIn', ''),
        const ResumeFieldSpec('Portfolio', ''),
        const ResumeFieldSpec('Address', ''),
        const ResumeFieldSpec('Date of Birth', ''),
        const ResumeFieldSpec('Nationality', ''),
        const ResumeFieldSpec('Gender', ''),
        const ResumeFieldSpec('Mother Tongue', ''),
        const ResumeFieldSpec('Other Languages', ''),
        ResumeFieldSpec('Years of Experience', profileValue('experience')),
        const ResumeFieldSpec('Certifications', ''),
        ResumeFieldSpec('Candidate Photo', profileValue('resumeFileName')),
      ],
      'Skills & Achievements' => [
        ResumeFieldSpec('Core Skills', profileSkills.join(', '), lines: 4),
        const ResumeFieldSpec('Career Notes / Achievements', '', lines: 4),
      ],
      'Experience' => [
        const ResumeFieldSpec('Company', ''),
        ResumeFieldSpec('Title', profileValue('preferredRole')),
        ResumeFieldSpec('Location', profileValue('currentLocation')),
        const ResumeFieldSpec('Joining Date', ''),
        const ResumeFieldSpec('Exit Date', ''),
        ResumeFieldSpec(
          'Bullets, achievements, responsibilities, tools, impact',
          profileValue('experience'),
          lines: 5,
        ),
      ],
      'Education' => [
        const ResumeFieldSpec('Institution', ''),
        ResumeFieldSpec('Degree', profileValue('education')),
        const ResumeFieldSpec('Year', ''),
      ],
      _ => const [],
    };
  }

  void openEditor(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ResumeEditScreen(
          title: title,
          complete: complete,
          fields: fields,
          onSaved: onSaved,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => openEditor(context),
      child: CardPanel(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: complete
                  ? Theme.of(context).colorScheme.primary
                  : AppColors.muted.withValues(alpha: 0.18),
              child: Icon(
                complete ? Icons.check : Icons.edit_outlined,
                color: complete ? Colors.white : AppColors.muted,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w400),
              ),
            ),
            TextButton(
              onPressed: () => openEditor(context),
              child: Text(complete ? 'Edit' : 'Fill'),
            ),
          ],
        ),
      ),
    );
  }
}

class ResumeFieldSpec {
  const ResumeFieldSpec(this.label, this.value, {this.lines = 1});

  final String label;
  final String value;
  final int lines;
}

class ResumeEditScreen extends StatefulWidget {
  const ResumeEditScreen({
    super.key,
    required this.title,
    required this.complete,
    required this.fields,
    required this.onSaved,
  });

  final String title;
  final bool complete;
  final List<ResumeFieldSpec> fields;
  final VoidCallback onSaved;

  @override
  State<ResumeEditScreen> createState() => _ResumeEditScreenState();
}

class _ResumeEditScreenState extends State<ResumeEditScreen> {
  late final List<TextEditingController> controllers;
  late final List<String> labels;
  late final List<int> lines;
  final scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    labels = [for (final field in widget.fields) field.label];
    lines = [for (final field in widget.fields) field.lines];
    controllers = [
      for (final field in widget.fields)
        TextEditingController(text: field.value),
    ];
  }

  bool get canAddSection =>
      widget.title == 'Experience' || widget.title == 'Education';

  String get addLabel =>
      widget.title == 'Experience' ? 'Add experience' : 'Add qualification';

  void addSection() {
    final nextLabels = widget.title == 'Experience'
        ? const [
            'Company',
            'Title',
            'Location',
            'Joining Date',
            'Exit Date',
            'Bullets, achievements, responsibilities, tools, impact',
          ]
        : const ['Institution', 'Degree', 'Year'];
    final nextLines = widget.title == 'Experience'
        ? const [1, 1, 1, 1, 1, 5]
        : const [1, 1, 1];

    setState(() {
      labels.addAll(nextLabels);
      lines.addAll(nextLines);
      controllers.addAll([for (final _ in nextLabels) TextEditingController()]);
    });
  }

  @override
  void dispose() {
    for (final controller in controllers) {
      controller.dispose();
    }
    scrollController.dispose();
    super.dispose();
  }

  void save() {
    widget.onSaved();
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${widget.complete ? 'Updated' : 'Saved'} ${widget.title} draft',
        ),
      ),
    );
  }

  bool isDateField(String label) =>
      label == 'Joining Date' || label == 'Exit Date' || label == 'Date of Birth';

  Future<void> pickDate(int index) async {
    final selected = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(1950),
      lastDate: DateTime(2100),
      helpText: 'Select ${labels[index]}',
    );
    if (selected == null) return;
    controllers[index].text =
        '${selected.day.toString().padLeft(2, '0')}/${selected.month.toString().padLeft(2, '0')}/${selected.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        title: Text(widget.title),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Scrollbar(
                controller: scrollController,
                thumbVisibility: true,
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CardPanel(
                        color: AppColors.brand,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const LabelText(
                              'Mobile resume builder',
                              onDark: true,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${widget.complete ? 'Update' : 'Fill'} ${widget.title}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 21,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Tap each field, save draft, and continue section by section.',
                              style: TextStyle(color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      CardPanel(
                        child: Column(
                          children: [
                            for (var i = 0; i < controllers.length; i++) ...[
                              TextField(
                                controller: controllers[i],
                                readOnly: isDateField(labels[i]),
                                onTap: isDateField(labels[i]) ? () => pickDate(i) : null,
                                minLines: lines[i],
                                maxLines: lines[i] > 1 ? lines[i] + 2 : 1,
                                decoration: InputDecoration(
                                  labelText: labels[i],
                                  suffixIcon: isDateField(labels[i])
                                      ? const Icon(Icons.calendar_month_outlined)
                                      : null,
                                  border: const OutlineInputBorder(),
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],
                            if (canAddSection)
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  onPressed: addSection,
                                  icon: const Icon(Icons.add),
                                  label: Text(addLabel),
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (widget.title == 'Personal Information') ...[
                        const SizedBox(height: 12),
                        const CardPanel(
                          child: MiniRow(
                            icon: Icons.verified_user_outlined,
                            title: 'Profile-ready details',
                            subtitle:
                                'These basics are used for resume preview and one-tap apply.',
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: save,
                  icon: const Icon(Icons.save_outlined, size: 18),
                  label: Text(widget.complete ? 'Update' : 'Save'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ResumePreviewCard extends StatelessWidget {
  const ResumePreviewCard({
    super.key,
    required this.session,
    required this.useProfileDetails,
  });

  final CandidateSession session;
  final bool useProfileDetails;

  @override
  Widget build(BuildContext context) {
    final role = useProfileDetails
        ? session.profileText('preferredRole', 'Preferred role pending')
        : 'Talent Draft role';
    final location = useProfileDetails
        ? session.profileText('preferredLocation', 'Preferred location pending')
        : 'Location to be added';
    final skills = !useProfileDetails
        ? 'Add skills for this Talent Draft'
        : session.skills.isEmpty
        ? 'Add skills to improve resume quality'
        : session.skills.take(4).join(', ');

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Resume preview'),
          const SizedBox(height: 10),
          Container(
            height: 150,
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.paper,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  useProfileDetails ? session.displayName : 'Talent Draft',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                Text('$role / $location'),
                const Divider(),
                Text(skills),
                const Spacer(),
                Text(
                  useProfileDetails
                      ? '${session.profileText('experience', 'Experience pending')} / ${session.profileText('education', 'Education pending')}'
                      : 'Experience / Education / Skills',
                  style: const TextStyle(color: AppColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ExportActionsCard extends StatelessWidget {
  const ExportActionsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      color: AppColors.accent.withValues(alpha: 0.18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Resume actions'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.upload_file_outlined),
                  label: const Text('Upload'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.picture_as_pdf_outlined),
                  label: const Text('PDF'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.download_outlined),
                  label: const Text('Word'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AiResumeCard extends StatelessWidget {
  const AiResumeCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.auto_awesome_outlined,
      title: 'AI resume suggestions',
      description:
          'Improve summary, skills, and experience bullets for each target role.',
    );
  }
}

class ApplicationTrackerCard extends StatelessWidget {
  const ApplicationTrackerCard({super.key});

  @override
  Widget build(BuildContext context) {
    final stages = [
      ('Applied', true),
      ('Shortlisted', true),
      ('Interview', true),
      ('Offered', false),
      ('Joined / Rejected', false),
    ];

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'ERP Manager', action: 'Interview'),
          const SizedBox(height: 4),
          const Text(
            'Job ID 26040001 / Hyderabad',
            style: TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 16),
          ...stages.map(
            (stage) => TimelineRow(label: stage.$1, active: stage.$2),
          ),
        ],
      ),
    );
  }
}

class NextActionCard extends StatelessWidget {
  const NextActionCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      color: AppColors.brand,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Interview alert', onDark: true),
          SizedBox(height: 12),
          Text(
            'Interview scheduled tomorrow',
            style: TextStyle(
              color: Colors.white,
              fontSize: 19,
              fontWeight: FontWeight.w400,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Online interview at 11:30 AM. Recruiter update is available in the application detail.',
            style: TextStyle(color: Colors.white70, height: 1.45),
          ),
        ],
      ),
    );
  }
}

class TimelineRow extends StatelessWidget {
  const TimelineRow({super.key, required this.label, required this.active});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 13),
      child: Row(
        children: [
          Icon(
            active ? Icons.check_circle : Icons.radio_button_unchecked,
            color: active
                ? Theme.of(context).colorScheme.primary
                : AppColors.muted,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w400),
            ),
          ),
          Text(
            active ? 'Updated' : 'Pending',
            style: const TextStyle(color: AppColors.muted, fontSize: 11.5),
          ),
        ],
      ),
    );
  }
}

class ApplicationListTile extends StatelessWidget {
  const ApplicationListTile({
    super.key,
    required this.title,
    required this.status,
    required this.meta,
  });

  final String title;
  final String status;
  final String meta;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w400),
                ),
                const SizedBox(height: 4),
                Text(
                  meta,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          StatusPill(label: status, color: AppColors.brand),
        ],
      ),
    );
  }
}

class PreparationCard extends StatelessWidget {
  const PreparationCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.psychology_outlined,
      title: 'Interview preparation',
      description:
          'Role-based checklist, interview tips, and job brief before the call.',
    );
  }
}

class RoadmapCard extends StatelessWidget {
  const RoadmapCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Advanced later'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.video_camera_front_outlined,
            title: 'Video introduction',
            subtitle: 'Upload a short candidate intro video',
          ),
          MiniRow(
            icon: Icons.group_add_outlined,
            title: 'Referral jobs',
            subtitle: 'Share jobs with friends and referrals',
          ),
        ],
      ),
    );
  }
}

class CandidateSummaryCard extends StatelessWidget {
  const CandidateSummaryCard({super.key, required this.session});

  final CandidateSession? session;

  @override
  Widget build(BuildContext context) {
    final completion = session?.profileCompletion ?? 0;
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => showProfileAction(context, 'Profile summary'),
      child: CardPanel(
        child: Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: AppColors.brand,
              child: Text(
                session?.initials ?? 'WC',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session?.displayName ?? 'Candidate',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${session?.profileText('preferredRole', 'Preferred role pending') ?? 'Preferred role pending'} / ${session?.profileText('preferredLocation', 'Location pending') ?? 'Location pending'}',
                    style: const TextStyle(color: AppColors.muted),
                  ),
                ],
              ),
            ),
            StatusPill(label: '$completion%', color: AppColors.brand),
          ],
        ),
      ),
    );
  }
}

void showProfileAction(BuildContext context, String title) {
  ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text('$title editor opened')));
}

class ProfileField {
  const ProfileField(this.label, this.key, {this.lines = 1});

  final String label;
  final String key;
  final int lines;
}

void openProfileEditor(
  BuildContext context, {
  required String title,
  required CandidateSession session,
  required List<ProfileField> fields,
  required ValueChanged<CandidateSession?> onUpdated,
}) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => ProfileEditScreen(
        title: title,
        session: session,
        fields: fields,
        onUpdated: onUpdated,
      ),
    ),
  );
}

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({
    super.key,
    required this.title,
    required this.session,
    required this.fields,
    required this.onUpdated,
  });

  final String title;
  final CandidateSession session;
  final List<ProfileField> fields;
  final ValueChanged<CandidateSession?> onUpdated;

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  late final Map<String, TextEditingController> controllers;
  bool saving = false;
  String error = '';

  @override
  void initState() {
    super.initState();
    controllers = {
      for (final field in widget.fields)
        field.key: TextEditingController(
          text: field.key == 'skills'
              ? widget.session.skills.join(', ')
              : widget.session.profileText(field.key, ''),
        ),
    };
  }

  @override
  void dispose() {
    for (final controller in controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    setState(() {
      saving = true;
      error = '';
    });
    try {
      final payload = Map<String, dynamic>.from(widget.session.profile);
      for (final field in widget.fields) {
        final value = controllers[field.key]!.text.trim();
        payload[field.key] = field.key == 'skills'
            ? value.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList()
            : value;
      }
      final profile = await CandidateApi.updateProfile(widget.session.token, payload);
      final updated = widget.session.withProfile(profile);
      widget.onUpdated(updated);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${widget.title} updated')),
      );
    } catch (exception) {
      if (mounted) {
        setState(() => error = exception.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            CardPanel(
              child: Column(
                children: [
                  for (final field in widget.fields) ...[
                    TextField(
                      controller: controllers[field.key],
                      minLines: field.lines,
                      maxLines: field.lines > 1 ? field.lines + 2 : 1,
                      decoration: InputDecoration(labelText: field.label),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (error.isNotEmpty)
                    Text(error, style: const TextStyle(color: AppColors.accentStrong)),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: saving ? null : save,
                      icon: saving
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save_outlined),
                      label: Text(saving ? 'Saving' : 'Save changes'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DocumentUploadScreen extends StatefulWidget {
  const DocumentUploadScreen({
    super.key,
    required this.session,
    required this.onUpdated,
  });

  final CandidateSession session;
  final ValueChanged<CandidateSession?> onUpdated;

  @override
  State<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends State<DocumentUploadScreen> {
  final selectedFiles = <String, String>{};
  bool uploading = false;
  String error = '';

  Future<void> pickDocument(String category) async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) return;
    final file = result.files.single;
    setState(() {
      selectedFiles[category] = file.name;
      error = '';
    });

    if (category != 'Resume' || file.bytes == null) return;
    setState(() => uploading = true);
    try {
      final payload = Map<String, dynamic>.from(widget.session.profile)
        ..['resumeFileName'] = file.name
        ..['resumeFileType'] = file.extension ?? 'file'
        ..['resumeFileData'] = base64Encode(file.bytes!);
      final profile = await CandidateApi.updateProfile(widget.session.token, payload);
      widget.onUpdated(widget.session.withProfile(profile));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Resume uploaded to your Werkly profile')),
        );
      }
    } catch (exception) {
      if (mounted) {
        setState(() => error = exception.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const categories = [
      ('Resume', Icons.description_outlined),
      ('Certificate', Icons.workspace_premium_outlined),
      ('ID proof', Icons.badge_outlined),
      ('Offer letter', Icons.assignment_turned_in_outlined),
      ('Experience letter', Icons.history_edu_outlined),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Document center')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Choose a document type and select a file from your device.'),
            const SizedBox(height: 16),
            ...categories.map(
              (item) => CardPanel(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(item.$2, color: Theme.of(context).colorScheme.primary),
                  title: Text(item.$1),
                  subtitle: Text(
                    selectedFiles[item.$1] ??
                        (item.$1 == 'Resume'
                            ? widget.session.profileText('resumeFileName', 'No file selected')
                            : 'No file selected'),
                  ),
                  trailing: IconButton(
                    onPressed: uploading ? null : () => pickDocument(item.$1),
                    icon: const Icon(Icons.upload_file_outlined),
                    tooltip: 'Upload ${item.$1}',
                  ),
                ),
              ),
            ),
            if (uploading) const LinearProgressIndicator(),
            if (error.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(error, style: const TextStyle(color: AppColors.accentStrong)),
              ),
          ],
        ),
      ),
    );
  }
}

class CandidateAnalyticsScreen extends StatefulWidget {
  const CandidateAnalyticsScreen({super.key, required this.session});

  final CandidateSession session;

  @override
  State<CandidateAnalyticsScreen> createState() => _CandidateAnalyticsScreenState();
}

class _CandidateAnalyticsScreenState extends State<CandidateAnalyticsScreen> {
  late final Future<List<Map<String, dynamic>>> applications;

  @override
  void initState() {
    super.initState();
    applications = CandidateApi.loadApplications(widget.session.token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Candidate analytics')),
      body: SafeArea(
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: applications,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Unable to load analytics: ${snapshot.error}'));
            }
            final items = snapshot.data ?? const [];
            final progressed = items.where((item) {
              final stage = '${item['stage'] ?? ''}'.toLowerCase();
              return stage != 'applied' && stage != 'rejected' && stage.isNotEmpty;
            }).length;
            final rate = items.isEmpty ? 0 : ((progressed / items.length) * 100).round();
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                CardPanel(
                  child: Column(
                    children: [
                      MiniRow(
                        icon: Icons.account_circle_outlined,
                        title: 'Profile completion',
                        subtitle: '${widget.session.profileCompletion}% live profile strength',
                      ),
                      MiniRow(
                        icon: Icons.send_outlined,
                        title: 'Applications sent',
                        subtitle: '${items.length} applications from Railway',
                      ),
                      MiniRow(
                        icon: Icons.trending_up_outlined,
                        title: 'Progression rate',
                        subtitle: '$rate% moved beyond applied',
                      ),
                      MiniRow(
                        icon: Icons.visibility_outlined,
                        title: 'Profile views',
                        subtitle: 'Tracking is not enabled yet',
                      ),
                      const MiniRow(
                        icon: Icons.download_outlined,
                        title: 'Resume downloads',
                        subtitle: 'Tracking is not enabled yet',
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class ProfileSectionCard extends StatelessWidget {
  const ProfileSectionCard({
    super.key,
    required this.title,
    required this.icon,
    required this.items,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final List<String> items;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: CardPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w400),
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.muted),
              ],
            ),
            const SizedBox(height: 10),
            ...items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  item,
                  style: const TextStyle(color: AppColors.muted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SkillsCard extends StatelessWidget {
  const SkillsCard({
    super.key,
    required this.session,
    required this.onUpdated,
  });

  final CandidateSession? session;
  final ValueChanged<CandidateSession?> onUpdated;

  @override
  Widget build(BuildContext context) {
    final skills = session?.skills ?? const <String>[];
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => openProfileEditor(
        context,
        title: 'Skills',
        session: session!,
        fields: const [ProfileField('Skills (comma separated)', 'skills')],
        onUpdated: onUpdated,
      ),
      child: CardPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const LabelText('Skills'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: (skills.isEmpty ? ['Add skills'] : skills)
                  .map((skill) => InfoPill(skill))
                  .toList(),
            ),
            const SizedBox(height: 8),
            const Align(
              alignment: Alignment.centerRight,
              child: Icon(Icons.chevron_right, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class DocumentCenterCard extends StatelessWidget {
  const DocumentCenterCard({
    super.key,
    required this.session,
    required this.onUpdated,
  });

  final CandidateSession? session;
  final ValueChanged<CandidateSession?> onUpdated;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DocumentUploadScreen(
            session: session!,
            onUpdated: onUpdated,
          ),
        ),
      ),
      child: CardPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const LabelText('Document center'),
            const SizedBox(height: 10),
            MiniRow(
              icon: Icons.description_outlined,
              title: 'Resume',
              subtitle:
                  session?.profileText('resumeFileName', 'Resume pending') ??
                  'Resume pending',
            ),
            const MiniRow(
              icon: Icons.workspace_premium_outlined,
              title: 'Certificates',
              subtitle: 'Upload certificates',
            ),
            const MiniRow(
              icon: Icons.badge_outlined,
              title: 'ID proof',
              subtitle: 'Upload ID proof',
            ),
            const MiniRow(
              icon: Icons.assignment_turned_in_outlined,
              title: 'Offer & experience letters',
              subtitle: 'Store past employment docs',
            ),
            const Align(
              alignment: Alignment.centerRight,
              child: Icon(Icons.chevron_right, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class OfflineDraftCard extends StatelessWidget {
  const OfflineDraftCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.cloud_done_outlined,
      title: 'Offline drafts',
      description:
          'Resume and profile edits are saved locally and synced after internet returns.',
    );
  }
}

class ShareCard extends StatelessWidget {
  const ShareCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => SharePlus.instance.share(
        ShareParams(
          text:
              '${session.displayName}\n${session.profileText('preferredRole', 'Candidate')}\n${session.profileText('preferredLocation', '')}\nShared from Werkly Candidate',
          subject: '${session.displayName} - Werkly candidate profile',
        ),
      ),
      child: const CardPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LabelText('Share options'),
            SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                InfoPill('WhatsApp resume'),
                InfoPill('Email resume'),
                InfoPill('Share job details'),
                InfoPill('Referral link'),
              ],
            ),
            SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Icon(Icons.chevron_right, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class InterviewAlertCard extends StatelessWidget {
  const InterviewAlertCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const FeatureCard(
      icon: Icons.notifications_active_outlined,
      title: 'Push notifications',
      description:
          'Job recommendations, interview reminders, and application updates.',
    );
  }
}

class NotificationsCenterCard extends StatelessWidget {
  const NotificationsCenterCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Notifications center'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.work_outline,
            title: 'Job match',
            subtitle: 'ERP Manager matches 92% of your profile',
          ),
          MiniRow(
            icon: Icons.event_available_outlined,
            title: 'Interview reminder',
            subtitle: 'Online interview tomorrow at 11:30 AM',
          ),
          MiniRow(
            icon: Icons.timeline_outlined,
            title: 'Application update',
            subtitle: 'Regional Sales Manager moved to shortlisted',
          ),
          MiniRow(
            icon: Icons.chat_bubble_outline,
            title: 'Recruiter message',
            subtitle: 'Werkly recruiter requested availability confirmation',
          ),
        ],
      ),
    );
  }
}

class MessagesCard extends StatelessWidget {
  const MessagesCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('In-app messages'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.chat_bubble_outline,
            title: 'Werkly recruiter',
            subtitle: 'Please confirm interview availability.',
          ),
          MiniRow(
            icon: Icons.campaign_outlined,
            title: 'New match',
            subtitle: 'ERP Manager role matches your profile.',
          ),
        ],
      ),
    );
  }
}

class SettingsPreviewCard extends StatelessWidget {
  const SettingsPreviewCard({
    super.key,
    required this.darkMode,
    required this.onDarkModeChanged,
  });

  final bool darkMode;
  final ValueChanged<bool> onDarkModeChanged;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Mobile settings'),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Dark mode'),
            subtitle: const Text('Candidate-friendly dark theme'),
            value: darkMode,
            onChanged: onDarkModeChanged,
          ),
          const MiniRow(
            icon: Icons.language_outlined,
            title: 'Language support',
            subtitle: 'English now, Telugu and Hindi later',
          ),
        ],
      ),
    );
  }
}

class FeatureCard extends StatelessWidget {
  const FeatureCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => showProfileAction(context, title),
      child: CardPanel(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w400),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      color: AppColors.muted,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}

class SyncStatusCard extends StatelessWidget {
  const SyncStatusCard({
    super.key,
    required this.title,
    required this.message,
    required this.icon,
  });

  final String title;
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      color: AppColors.accent.withValues(alpha: 0.16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.accentStrong),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w400),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: const TextStyle(color: AppColors.muted, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class MiniRow extends StatelessWidget {
  const MiniRow({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w400),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w400),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              color: AppColors.muted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10.5,
          fontWeight: FontWeight.w400,
        ),
      ),
    );
  }
}

class InfoPill extends StatelessWidget {
  const InfoPill(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: Theme.of(context).colorScheme.primary,
          fontSize: 11.5,
          fontWeight: FontWeight.w400,
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.action});

  final String title;
  final String? action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400),
          ),
        ),
        if (action != null)
          Text(
            action!,
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w400,
            ),
          ),
      ],
    );
  }
}

class LabelText extends StatelessWidget {
  const LabelText(this.text, {super.key, this.onDark = false});

  final String text;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: onDark
            ? AppColors.accent
            : Theme.of(context).colorScheme.primary,
        fontSize: 10.5,
        fontWeight: FontWeight.w400,
        letterSpacing: 1.7,
      ),
    );
  }
}

class ProgressBar extends StatelessWidget {
  const ProgressBar({super.key, required this.value, this.onDark = false});

  final double value;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: LinearProgressIndicator(
        value: value,
        minHeight: 8,
        backgroundColor: onDark
            ? Colors.white24
            : AppColors.muted.withValues(alpha: 0.16),
        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accent),
      ),
    );
  }
}

class CardPanel extends StatelessWidget {
  const CardPanel({
    super.key,
    required this.child,
    this.color,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final Color? color;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final panelColor = color ?? scheme.surface;

    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: panelColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.line),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}
