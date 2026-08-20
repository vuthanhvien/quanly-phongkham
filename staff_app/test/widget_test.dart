import 'package:flutter_test/flutter_test.dart';
import 'package:staff_app/main.dart';

void main() {
  testWidgets('staff member can enter the Shift Pulse dashboard', (
    tester,
  ) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('Bắt đầu ca trực'), findsOneWidget);
    await tester.tap(find.text('Đăng nhập'));
    await tester.pumpAndSettle();

    expect(find.text('Ca trực'), findsOneWidget);
    expect(find.text('18 / 26 bệnh nhân'), findsOneWidget);
  });
}
