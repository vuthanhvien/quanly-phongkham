import 'package:get/get.dart';
import '../../core/utils/error_utils.dart';
import '../../data/models/appointment.dart';
import '../../data/repositories/appointment_repository.dart';

class BookingDetailController extends GetxController {
  BookingDetailController(this._repository, this.id);

  final AppointmentRepository _repository;
  final String id;

  final isLoading = true.obs;
  final isCancelling = false.obs;
  final errorMessage = RxnString();
  final Rxn<Appointment> appointment = Rxn<Appointment>();

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      appointment.value = await _repository.detail(id);
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> cancel() async {
    isCancelling.value = true;
    try {
      appointment.value = await _repository.cancel(id);
    } catch (e) {
      Get.snackbar('Không thể hủy lịch hẹn', describeError(e));
    } finally {
      isCancelling.value = false;
    }
  }
}
