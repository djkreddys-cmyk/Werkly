import 'package:flutter_test/flutter_test.dart';

import 'package:werkly_candidate_app/main.dart';

void main() {
  testWidgets('shows candidate dashboard', (WidgetTester tester) async {
    await tester.pumpWidget(const WerklyCandidateApp());

    expect(find.text('Good morning, Jaswanth'), findsOneWidget);
    expect(find.text('Recommended jobs'), findsOneWidget);
    expect(find.text('ERP Manager'), findsOneWidget);
  });

  testWidgets('navigates to resume builder', (WidgetTester tester) async {
    await tester.pumpWidget(const WerklyCandidateApp());

    await tester.tap(find.text('Resume'));
    await tester.pump();

    expect(find.text('Build once, apply faster'), findsOneWidget);
    expect(find.text('Resume progress'), findsOneWidget);
  });
}
