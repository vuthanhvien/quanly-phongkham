import 'package:get/get.dart';
import '../../data/repositories/invoice_repository.dart';
import 'invoices_controller.dart';

class InvoicesBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => InvoiceRepository());
    Get.lazyPut(() => InvoicesController(Get.find()));
  }
}
