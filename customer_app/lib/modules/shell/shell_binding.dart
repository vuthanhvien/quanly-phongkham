import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/invoice_repository.dart';
import '../bookings/bookings_controller.dart';
import '../home/home_controller.dart';
import '../invoices/invoices_controller.dart';
import 'shell_controller.dart';

class ShellBinding extends Bindings {
  @override
  void dependencies() {
    Get.put(ShellController());
    final appointmentSync = Get.isRegistered<AppointmentSyncController>()
        ? Get.find<AppointmentSyncController>()
        : Get.put(AppointmentSyncController());
    final appointmentRepository = AppointmentRepository();
    Get.put(HomeController(appointmentRepository, appointmentSync));
    Get.put(BookingsController(appointmentRepository, appointmentSync));
    Get.put(InvoicesController(InvoiceRepository()));
  }
}
