import 'package:get/get.dart';
import '../../data/repositories/appointment_repository.dart';
import 'home_controller.dart';

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => AppointmentRepository());
    Get.lazyPut(() => HomeController(Get.find()));
  }
}
