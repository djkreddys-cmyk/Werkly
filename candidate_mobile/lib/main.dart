import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

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
    if (value is List) return value.where((item) => '$item'.trim().isNotEmpty).join(', ');
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  List<String> get skills {
    final value = profile['skills'];
    if (value is List) {
      return value.map((item) => item.toString()).where((item) => item.trim().isNotEmpty).toList();
    }
    final text = value?.toString() ?? '';
    return text.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList();
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
    return ((checks.where((done) => done).length / checks.length) * 100).round();
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
          ? (json['responsibilities'] as List).map((item) => item.toString()).toList()
          : const [],
      requirements: json['requirements'] is List
          ? (json['requirements'] as List).map((item) => item.toString()).toList()
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
      const JobsScreen(),
      ResumeScreen(candidateSession: widget.candidateSession!),
      const ApplicationsScreen(),
      ProfileScreen(
        darkMode: widget.darkMode,
        candidateSession: widget.candidateSession,
        onDarkModeChanged: widget.onDarkModeChanged,
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
  const LoginScreen({
    super.key,
    required this.onCandidateSessionChanged,
  });

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
    final preferredRole = candidateSession.profileText('preferredRole', 'Candidate');
    final preferredLocation = candidateSession.profileText('preferredLocation', 'Location pending');
    return ScreenFrame(
      eyebrow: 'Werkly Candidate',
      title: 'Good morning, ${candidateSession.displayName}',
      trailing: CircleAvatar(
        radius: 23,
        backgroundColor: AppColors.brand,
        child: Text(
          candidateSession.initials,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w400),
        ),
      ),
      children: [
        OnboardingFlowCard(session: candidateSession),
        ProfileStrengthCard(session: candidateSession),
        ProfileCompletionChecklistCard(session: candidateSession),
        MetricStrip(session: candidateSession),
        const SectionHeader(title: 'Quick actions'),
        const QuickActionGrid(),
        CardPanel(
          child: MiniRow(
            icon: Icons.track_changes_outlined,
            title: preferredRole,
            subtitle: '$preferredLocation / ${candidateSession.profileCompletion}% profile complete',
          ),
        ),
      ],
    );
  }
}

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  String selectedFilter = 'All';
  bool loadingJobs = true;
  String jobsError = '';
  List<CandidateJob> liveJobs = const [];
  final filters = [
    'All',
    'IT',
    'Non-IT',
    'Hyderabad',
    'Vijayawada',
    '8+ yrs',
    '10 LPA+',
    'Full Time',
  ];

  @override
  void initState() {
    super.initState();
    loadLiveJobs();
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
      summary: 'Own regional sales growth, dealer relationships, and client follow-ups.',
      description: 'Full-time regional role for experienced sales candidates.',
      responsibilities: ['Manage regional pipeline', 'Build dealer network', 'Report sales progress'],
      requirements: ['6+ years sales experience', 'Strong AP/Telangana market knowledge'],
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
      description: 'ERP operations role for candidates with implementation and MIS experience.',
      responsibilities: ['Own ERP delivery', 'Coordinate stakeholders', 'Improve reporting'],
      requirements: ['8+ years ERP experience', 'Process and reporting discipline'],
      deadline: 'Apply soon',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final jobsToShow = liveJobs.isEmpty ? fallbackJobs : liveJobs;

    return ScreenFrame(
      eyebrow: 'Job Search',
      title: 'Find roles that match your profile',
      children: [
        const SearchField(),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: filters.map((filter) {
              final selected = filter == selectedFilter;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  selected: selected,
                  label: Text(filter),
                  onSelected: (_) => setState(() => selectedFilter = filter),
                ),
              );
            }).toList(),
          ),
        ),
        const FilterSummaryCard(),
        const JobAlertsCard(),
        SectionHeader(
          title: liveJobs.isEmpty ? 'Recommended jobs' : 'Live jobs',
          action: loadingJobs ? 'Loading' : '${jobsToShow.length}',
        ),
        if (jobsError.isNotEmpty)
          SyncStatusCard(
            title: 'Live jobs unavailable',
            message: '$jobsError. Showing recommended fallback jobs.',
            icon: Icons.cloud_off_outlined,
          ),
        ...jobsToShow.map(
          (job) => JobCard(
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
          ),
        ),
        const ApplyConfirmationCard(),
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

  bool categoryComplete(String title) {
    final session = widget.candidateSession;
    if (savedResumeCategories.contains(title)) return true;
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
        const ResumeBackendSyncCard(),
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
            onSaved: () => markSaved(category),
          ),
        ),
        ResumePreviewCard(session: session),
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
  });

  final bool darkMode;
  final CandidateSession? candidateSession;
  final ValueChanged<bool> onDarkModeChanged;

  @override
  Widget build(BuildContext context) {
    final session = candidateSession;
    return ScreenFrame(
      eyebrow: 'Smart Profile',
      title: 'Your candidate profile',
      children: [
        CandidateSummaryCard(session: session),
        ProfileBackendSyncCard(session: candidateSession),
        ProfileSectionCard(
          title: 'Personal details',
          icon: Icons.person_outline,
          items: [
            session?.displayName ?? 'Candidate',
            session?.email ?? 'Email pending',
            session?.phone.isEmpty == false ? session!.phone : 'Phone pending',
          ],
        ),
        ProfileSectionCard(
          title: 'Education',
          icon: Icons.school_outlined,
          items: [session?.profileText('education', 'Education pending') ?? 'Education pending'],
        ),
        ProfileSectionCard(
          title: 'Experience',
          icon: Icons.badge_outlined,
          items: [
            session?.profileText('experience', 'Experience pending') ?? 'Experience pending',
            session?.profileText('preferredRole', 'Preferred role pending') ?? 'Preferred role pending',
            session?.profileText('currentCtc', 'Current CTC pending') ?? 'Current CTC pending',
          ],
        ),
        ProfileSectionCard(
          title: 'Preferences',
          icon: Icons.tune_outlined,
          items: [
            'Preferred role: ${session?.profileText('preferredRole', 'Pending') ?? 'Pending'}',
            'Expected CTC: ${session?.profileText('expectedCtc', 'Pending') ?? 'Pending'}',
            'Notice period: ${session?.profileText('noticePeriod', 'Pending') ?? 'Pending'}',
            'Location: ${session?.profileText('preferredLocation', 'Pending') ?? 'Pending'}',
          ],
        ),
        SkillsCard(session: session),
        DocumentCenterCard(session: session),
        const DocumentUploadFlowCard(),
        const OfflineDraftCard(),
        const ShareCard(),
        SettingsPreviewCard(
          darkMode: darkMode,
          onDarkModeChanged: onDarkModeChanged,
        ),
        const CandidateAnalyticsCard(),
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
                .map(
                  (item) => InfoPill(
                    item.$2 ? '${item.$1} done' : item.$1,
                  ),
                )
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
        session.profileText('resumeFileName', 'Upload existing resume or build one')
      ),
      (
        Icons.school_outlined,
        'Education ${session.profileText('education', '').isEmpty ? 'pending' : 'added'}',
        session.profileText('education', 'Add latest qualification details')
      ),
      (
        Icons.workspace_premium_outlined,
        'Skills ${session.skills.isEmpty ? 'pending' : 'added'}',
        session.skills.isEmpty ? 'Add role skills' : session.skills.take(3).join(', ')
      ),
      (
        Icons.payments_outlined,
        'Expected CTC ${session.profileText('expectedCtc', '').isEmpty ? 'pending' : 'added'}',
        session.profileText('expectedCtc', 'Add expected CTC')
      ),
      (
        Icons.place_outlined,
        'Preferred location ${session.profileText('preferredLocation', '').isEmpty ? 'pending' : 'added'}',
        session.profileText('preferredLocation', 'Add preferred location')
      ),
    ];
    final done = checks.where((item) => !item.$2.contains('pending')).length;

    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Profile checklist', action: '$done/${checks.length} done'),
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
            subtitle: session.skills.isEmpty ? 'Add tools and certifications' : session.skills.take(4).join(', '),
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
  const DocumentUploadFlowCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
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
        ],
      ),
    );
  }
}

class CandidateAnalyticsCard extends StatelessWidget {
  const CandidateAnalyticsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Candidate analytics'),
          SizedBox(height: 10),
          MiniRow(
            icon: Icons.visibility_outlined,
            title: 'Profile views',
            subtitle: '18 this month',
          ),
          MiniRow(
            icon: Icons.send_outlined,
            title: 'Applications sent',
            subtitle: '4 active applications',
          ),
          MiniRow(
            icon: Icons.trending_up_outlined,
            title: 'Shortlist rate',
            subtitle: '50% based on current applications',
          ),
          MiniRow(
            icon: Icons.download_outlined,
            title: 'Resume downloads',
            subtitle: '3 downloads by Werkly team',
          ),
        ],
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
                      style: const TextStyle(color: Colors.white70, height: 1.4),
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
            value: session.profileText('resumeFileName', '').isEmpty ? '0' : '1',
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

    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.55,
      children: actions
          .map(
            (item) => CardPanel(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(item.$1, color: Theme.of(context).colorScheme.primary),
                  const Spacer(),
                  Text(
                    item.$2,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.2,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class SearchField extends StatelessWidget {
  const SearchField({super.key});

  @override
  Widget build(BuildContext context) {
    return TextField(
      decoration: InputDecoration(
        hintText: 'Search role, skill, location',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

class FilterSummaryCard extends StatelessWidget {
  const FilterSummaryCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LabelText('Filters'),
          SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              InfoPill('Role: ERP / Sales'),
              InfoPill('Sector: IT / Non-IT'),
              InfoPill('Location: Hyd / Vja'),
              InfoPill('Salary: 10 LPA+'),
              InfoPill('Job type: Full Time'),
            ],
          ),
        ],
      ),
    );
  }
}

class JobCard extends StatelessWidget {
  const JobCard({
    super.key,
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
  });

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

  void showDetails(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$sector / $location', style: const TextStyle(color: AppColors.muted)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  InfoPill(salary),
                  InfoPill(experience),
                  InfoPill(type),
                  if (deadline.isNotEmpty) InfoPill('Deadline: $deadline'),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                summary.isEmpty ? description : summary,
                style: const TextStyle(height: 1.35),
              ),
              const SizedBox(height: 12),
              if (responsibilities.isNotEmpty) ...[
                const LabelText('Responsibilities'),
                const SizedBox(height: 6),
                ...responsibilities.take(4).map(
                      (item) => MiniRow(
                        icon: Icons.task_alt_outlined,
                        title: item,
                        subtitle: '',
                      ),
                    ),
              ],
              if (requirements.isNotEmpty) ...[
                const SizedBox(height: 8),
                const LabelText('Requirements'),
                const SizedBox(height: 6),
                ...requirements.take(4).map(
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
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close details'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Apply flow opened for $title')),
              );
            },
            icon: const Icon(Icons.touch_app_outlined, size: 18),
            label: const Text('Apply'),
          ),
        ],
      ),
    );
  }

  void shareJob(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Share ready for $title')),
    );
  }

  void applyJob(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Apply flow opened for $title')),
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
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => showDetails(context),
            icon: const Icon(Icons.visibility_outlined, size: 18),
            label: const Text('Details'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilledButton.icon(
            onPressed: () => applyJob(context),
            icon: const Icon(Icons.touch_app_outlined, size: 18),
            label: const Text('Apply'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final showInlineActions = constraints.maxWidth >= 400;

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
      },
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
    required this.onSaved,
  });

  final String title;
  final bool complete;
  final CandidateSession session;
  final VoidCallback onSaved;

  List<ResumeFieldSpec> get fields {
    return switch (title) {
      'Personal Information' => [
        ResumeFieldSpec('Full Name', session.displayName),
        ResumeFieldSpec('Email', session.email),
        ResumeFieldSpec('Phone', session.phone),
        const ResumeFieldSpec('Alternative Number', ''),
        ResumeFieldSpec('Location', session.profileText('currentLocation', '')),
        const ResumeFieldSpec('LinkedIn', ''),
        const ResumeFieldSpec('Portfolio', ''),
        const ResumeFieldSpec('Address', ''),
        const ResumeFieldSpec('Date of Birth', ''),
        const ResumeFieldSpec('Nationality', ''),
        const ResumeFieldSpec('Gender', ''),
        const ResumeFieldSpec('Mother Tongue', ''),
        const ResumeFieldSpec('Other Languages', ''),
        ResumeFieldSpec('Years of Experience', session.profileText('experience', '')),
        const ResumeFieldSpec('Certifications', ''),
        ResumeFieldSpec('Candidate Photo', session.profileText('resumeFileName', '')),
      ],
      'Skills & Achievements' => [
        ResumeFieldSpec('Core Skills', session.skills.join(', '), lines: 4),
        const ResumeFieldSpec('Career Notes / Achievements', '', lines: 4),
      ],
      'Experience' => [
        const ResumeFieldSpec('Company', ''),
        ResumeFieldSpec('Title', session.profileText('preferredRole', '')),
        ResumeFieldSpec('Location', session.profileText('currentLocation', '')),
        const ResumeFieldSpec('Joined Month', ''),
        const ResumeFieldSpec('Joined Year', ''),
        const ResumeFieldSpec('Exit Month', ''),
        const ResumeFieldSpec('Exit Year / Present', ''),
        ResumeFieldSpec(
          'Bullets, achievements, responsibilities, tools, impact',
          session.profileText('experience', ''),
          lines: 5,
        ),
      ],
      'Education' => [
        const ResumeFieldSpec('Institution', ''),
        ResumeFieldSpec('Degree', session.profileText('education', '')),
        const ResumeFieldSpec('Year', ''),
      ],
      _ => const [],
    };
  }

  void openEditor(BuildContext context) {
    final controllers = [
      for (final field in fields) TextEditingController(text: field.value),
    ];
    showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
        title: Text('${complete ? 'Edit' : 'Fill'} $title'),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < fields.length; i++) ...[
                  TextField(
                    controller: controllers[i],
                    minLines: fields[i].lines,
                    maxLines: fields[i].lines > 1 ? fields[i].lines + 2 : 1,
                    decoration: InputDecoration(
                      labelText: fields[i].label,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          FilledButton(
            onPressed: () {
              onSaved();
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    '${complete ? 'Updated' : 'Saved'} $title draft',
                  ),
                ),
              );
            },
            child: Text(complete ? 'Update' : 'Save'),
          ),
        ],
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

class ResumePreviewCard extends StatelessWidget {
  const ResumePreviewCard({super.key, required this.session});

  final CandidateSession session;

  @override
  Widget build(BuildContext context) {
    final role = session.profileText('preferredRole', 'Preferred role pending');
    final location = session.profileText('preferredLocation', 'Preferred location pending');
    final skills = session.skills.isEmpty
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
                  session.displayName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w400),
                ),
                Text('$role / $location'),
                const Divider(),
                Text(skills),
                const Spacer(),
                Text(
                  '${session.profileText('experience', 'Experience pending')} / ${session.profileText('education', 'Education pending')}',
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
    return CardPanel(
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
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w400),
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
    );
  }
}

class ProfileSectionCard extends StatelessWidget {
  const ProfileSectionCard({
    super.key,
    required this.title,
    required this.icon,
    required this.items,
  });

  final String title;
  final IconData icon;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
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
              child: Text(item, style: const TextStyle(color: AppColors.muted)),
            ),
          ),
        ],
      ),
    );
  }
}

class SkillsCard extends StatelessWidget {
  const SkillsCard({super.key, required this.session});

  final CandidateSession? session;

  @override
  Widget build(BuildContext context) {
    final skills = session?.skills ?? const <String>[];
    return CardPanel(
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
        ],
      ),
    );
  }
}

class DocumentCenterCard extends StatelessWidget {
  const DocumentCenterCard({super.key, required this.session});

  final CandidateSession? session;

  @override
  Widget build(BuildContext context) {
    return CardPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LabelText('Document center'),
          const SizedBox(height: 10),
          MiniRow(
            icon: Icons.description_outlined,
            title: 'Resume',
            subtitle: session?.profileText('resumeFileName', 'Resume pending') ?? 'Resume pending',
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
        ],
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
  const ShareCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const CardPanel(
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
        ],
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
    return CardPanel(
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

