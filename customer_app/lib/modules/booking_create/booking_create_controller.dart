import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../core/utils/error_utils.dart';
import '../../data/models/branch.dart';
import '../../data/models/doctor.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/lookup_repository.dart';

class BookingCreateController extends GetxController {
  BookingCreateController(this._appointmentRepository, this._lookupRepository);

  final AppointmentRepository _appointmentRepository;
  final LookupRepository _lookupRepository;

  final isLoadingLookups = true.obs;
  final isSubmitting = false.obs;
  final errorMessage = RxnString();

  final branches = <Branch>[].obs;
  final doctors = <Doctor>[].obs;

  final RxnString selectedBranchId = RxnString();
  final RxnString selectedDoctorId = RxnString();
  final selectedType = 'CONSULTATION'.obs;
  final Rxn<DateTime> selectedDate = Rxn<DateTime>();
  final selectedTime = Rxn<Duration>();
  final note = ''.obs;

  @override
  void onInit() {
    super.onInit();
    _loadLookups();
  }

  Future<void> _loadLookups() async {
    isLoadingLookups.value = true;
    try {
      final results = await Future.wait([
        _lookupRepository.branches(),
        _lookupRepository.doctors(),
      ]);
      branches.assignAll(results[0] as List<Branch>);
      doctors.assignAll(results[1] as List<Doctor>);
      if (branches.isNotEmpty) selectedBranchId.value = branches.first.id;
    } catch (e) {
      errorMessage.value = describeError(e);
    } finally {
      isLoadingLookups.value = false;
    }
  }

  Future<bool> submit() async {
    if (selectedBranchId.value == null) {
      errorMessage.value = 'Vui lòng chọn chi nhánh';
      return false;
    }
    if (selectedDate.value == null || selectedTime.value == null) {
      errorMessage.value = 'Vui lòng chọn ngày và giờ hẹn';
      return false;
    }

    final date = selectedDate.value!;
    final time = selectedTime.value!;
    final start = DateTime(date.year, date.month, date.day).add(time);
    final end = start.add(const Duration(minutes: 30));

    if (start.isBefore(DateTime.now())) {
      errorMessage.value = 'Thời gian hẹn phải ở tương lai';
      return false;
    }

    isSubmitting.value = true;
    errorMessage.value = null;
    try {
      await _appointmentRepository.create(
        branchId: selectedBranchId.value!,
        type: selectedType.value,
        startTime: start,
        endTime: end,
        doctorStaffId: selectedDoctorId.value,
        note: note.value.trim().isEmpty ? null : note.value.trim(),
      );
      Get.find<AppointmentSyncController>().requestRefresh();
      return true;
    } catch (e) {
      errorMessage.value = describeError(e);
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }
}
