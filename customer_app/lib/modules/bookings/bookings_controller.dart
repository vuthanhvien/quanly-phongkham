import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../core/utils/error_utils.dart';
import '../../data/models/appointment.dart';
import '../../data/repositories/appointment_repository.dart';

class BookingsController extends GetxController {
  BookingsController(this._repository, this._sync);

  final AppointmentRepository _repository;
  final AppointmentSyncController _sync;

  final isLoading = false.obs;
  final errorMessage = RxnString();
  final appointments = <Appointment>[].obs;

  List<Appointment> get upcoming =>
      appointments.where((a) => a.isUpcoming).toList();
  List<Appointment> get history =>
      appointments.where((a) => !a.isUpcoming).toList();

  @override
  void onInit() {
    super.onInit();
    ever<int>(_sync.revision, (_) => load());
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      final data = await _repository.list();
      appointments.assignAll(data);
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> cancel(String id) async {
    try {
      final updated = await _repository.cancel(id);
      final index = appointments.indexWhere((a) => a.id == id);
      if (index != -1) appointments[index] = updated;
      _sync.requestRefresh();
    } catch (e) {
      Get.snackbar('Không thể hủy lịch hẹn', describeError(e));
    }
  }
}
