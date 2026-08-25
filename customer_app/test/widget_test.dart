import 'package:flutter_test/flutter_test.dart';

import 'package:customer_app/routes/app_routes.dart';

void main() {
  test('Public entry route is the clinic home screen', () {
    expect(AppRoutes.shell, '/');
  });
}
