import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../data/repositories/appointment_repository.dart';
import 'home_controller.dart';

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => AppointmentRepository());
    if (!Get.isRegistered<AppointmentSyncController>()) {
      Get.put(AppointmentSyncController());
    }
    Get.lazyPut(() => HomeController(Get.find(), Get.find()));
  }
}
