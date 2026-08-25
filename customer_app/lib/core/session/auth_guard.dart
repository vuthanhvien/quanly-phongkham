import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import '../../routes/app_routes.dart';
import 'session_controller.dart';

/// Keeps personal resources behind authentication while leaving the clinic's
/// public experience available to every visitor.
class AuthGuard extends GetMiddleware {
  @override
  RouteSettings? redirect(String? route) {
    if (!Get.find<SessionController>().isLoggedIn) {
      return const RouteSettings(name: AppRoutes.phoneEntry);
    }
    return null;
  }
}
