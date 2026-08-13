import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';

import 'package:customer_app/app.dart';
import 'package:customer_app/core/session/session_controller.dart';

void main() {
  testWidgets('App boots to phone entry screen when logged out', (
    WidgetTester tester,
  ) async {
    GetStorage.init();
    Get.put(SessionController(), permanent: true);

    await tester.pumpWidget(const CustomerApp());
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập'), findsOneWidget);
  });
}
