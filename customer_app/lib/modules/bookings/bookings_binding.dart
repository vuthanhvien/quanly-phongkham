import 'package:get/get.dart';
import '../../data/repositories/appointment_repository.dart';
import 'bookings_controller.dart';

class BookingsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => AppointmentRepository());
    Get.lazyPut(() => BookingsController(Get.find()));
  }
}
