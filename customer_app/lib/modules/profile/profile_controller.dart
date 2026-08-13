import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/utils/error_utils.dart';
import '../../data/repositories/customer_repository.dart';

class ProfileController extends GetxController {
  ProfileController(this._repository);

  final CustomerRepository _repository;
  final isRefreshing = false.obs;
  final errorMessage = RxnString();

  Future<void> refreshProfile() async {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    errorMessage.value = null;
    try {
      final customer = await _repository.me();
      Get.find<SessionController>().updateProfile(customer);
    } catch (error) {
      errorMessage.value = describeError(error);
    } finally {
      isRefreshing.value = false;
    }
  }
}
