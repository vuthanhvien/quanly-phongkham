import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/utils/error_utils.dart';
import '../../data/repositories/auth_repository.dart';
import '../../routes/app_routes.dart';

class AuthController extends GetxController {
  AuthController(this._repository);

  final AuthRepository _repository;

  final phone = ''.obs;
  final isSubmitting = false.obs;
  final errorMessage = RxnString();
  final devCode = RxnString();

  Future<void> requestOtp(String phoneNumber) async {
    final trimmed = phoneNumber.trim();
    if (trimmed.length < 9) {
      errorMessage.value = 'Vui lòng nhập số điện thoại hợp lệ';
      return;
    }
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.requestOtp(trimmed);
      phone.value = trimmed;
      devCode.value = result.devCode;
      Get.toNamed(AppRoutes.otpVerify, arguments: trimmed);
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<void> verifyOtp(String phoneNumber, String code) async {
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.verifyOtp(phoneNumber, code);
      await Get.find<SessionController>().login(
        result.accessToken,
        result.customer,
      );
      Get.offAllNamed(AppRoutes.shell);
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isSubmitting.value = false;
    }
  }
}
