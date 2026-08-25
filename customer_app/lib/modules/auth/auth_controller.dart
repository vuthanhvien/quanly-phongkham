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
  final registrationName = RxnString();

  void reset() {
    phone.value = '';
    errorMessage.value = null;
    devCode.value = null;
    registrationName.value = null;
    isSubmitting.value = false;
  }

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

  Future<void> loginWithEmail(String email, String password) async {
    final normalizedEmail = email.trim();
    if (!GetUtils.isEmail(normalizedEmail)) {
      errorMessage.value = 'Vui lòng nhập email hợp lệ';
      return;
    }
    if (password.length < 6) {
      errorMessage.value = 'Mật khẩu cần ít nhất 6 ký tự';
      return;
    }

    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.loginWithEmail(
        normalizedEmail,
        password,
      );
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

  Future<bool> startPhoneRegistration(
    String fullName,
    String phoneNumber,
  ) async {
    final name = fullName.trim();
    final phone = phoneNumber.trim();
    if (name.length < 2 || phone.length < 9) {
      errorMessage.value = 'Vui lòng nhập họ tên và số điện thoại hợp lệ';
      return false;
    }
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.requestPhoneRegistration(name, phone);
      registrationName.value = name;
      this.phone.value = phone;
      devCode.value = result.devCode;
      return true;
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isSubmitting.value = false;
    }
    return false;
  }

  Future<void> completePhoneRegistration(
    String phoneNumber,
    String code,
  ) async {
    final name = registrationName.value;
    if (name == null) {
      errorMessage.value = 'Phiên đăng ký đã hết hạn, vui lòng thử lại';
      return;
    }
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.verifyPhoneRegistration(
        name,
        phoneNumber,
        code,
      );
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

  Future<void> requestPhoneRegistrationOtp(
    String fullName,
    String phoneNumber,
  ) async {
    final name = fullName.trim();
    if (name.isEmpty) {
      errorMessage.value = 'Phiên đăng ký đã hết hạn, vui lòng thử lại';
      return;
    }
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.requestPhoneRegistration(
        name,
        phoneNumber,
      );
      devCode.value = result.devCode;
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<void> registerWithEmail(
    String fullName,
    String email,
    String password,
  ) async {
    final name = fullName.trim();
    if (name.length < 2 ||
        !GetUtils.isEmail(email.trim()) ||
        password.length < 6) {
      errorMessage.value =
          'Vui lòng nhập họ tên, email hợp lệ và mật khẩu từ 6 ký tự';
      return;
    }
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      final result = await _repository.registerWithEmail(
        name,
        email.trim(),
        password,
      );
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
