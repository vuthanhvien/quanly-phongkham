import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../data/repositories/appointment_repository.dart';
import 'bookings_controller.dart';

class BookingsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => AppointmentRepository());
    if (!Get.isRegistered<AppointmentSyncController>()) {
      Get.put(AppointmentSyncController());
    }
    Get.lazyPut(() => BookingsController(Get.find(), Get.find()));
  }
}
