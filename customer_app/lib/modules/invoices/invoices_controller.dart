import 'package:get/get.dart';
import '../../core/utils/error_utils.dart';
import '../../data/models/invoice.dart';
import '../../data/repositories/invoice_repository.dart';

class InvoicesController extends GetxController {
  InvoicesController(this._repository);

  final InvoiceRepository _repository;

  final isLoading = false.obs;
  final errorMessage = RxnString();
  final invoices = <Invoice>[].obs;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      final data = await _repository.list();
      invoices.assignAll(data);
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isLoading.value = false;
    }
  }
}
