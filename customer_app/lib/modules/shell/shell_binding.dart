import 'package:get/get.dart';
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
    final appointmentRepository = AppointmentRepository();
    Get.put(HomeController(appointmentRepository));
    Get.put(BookingsController(appointmentRepository));
    Get.put(InvoicesController(InvoiceRepository()));
  }
}
