import 'package:get/get.dart';
import '../../data/models/customer_overview.dart';
import '../../data/repositories/customer_overview_repository.dart';

class CustomerOverviewController extends GetxController {
  CustomerOverviewController(this._repository);
  final CustomerOverviewRepository _repository;
  final data = Rxn<CustomerOverview>();
  final isLoading = false.obs;
  final errorMessage = RxnString();

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      data.value = await _repository.get();
    } catch (_) {
      errorMessage.value = 'Không thể tải hồ sơ khám. Vui lòng thử lại.';
    } finally {
      isLoading.value = false;
    }
  }
}
