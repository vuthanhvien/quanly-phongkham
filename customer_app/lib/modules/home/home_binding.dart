import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../core/session/session_controller.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/lookup_repository.dart';
import 'home_controller.dart';

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => AppointmentRepository());
    Get.lazyPut(() => LookupRepository());
    if (!Get.isRegistered<AppointmentSyncController>()) {
      Get.put(AppointmentSyncController());
    }
    Get.lazyPut(
      () => HomeController(
        Get.find<AppointmentRepository>(),
        Get.find<LookupRepository>(),
        Get.find<AppointmentSyncController>(),
        Get.find<SessionController>(),
      ),
    );
  }
}
