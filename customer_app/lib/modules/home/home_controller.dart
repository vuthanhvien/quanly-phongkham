import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../data/models/appointment.dart';
import '../../data/repositories/appointment_repository.dart';

class HomeController extends GetxController {
  HomeController(this._repository, this._sync);

  final AppointmentRepository _repository;
  final AppointmentSyncController _sync;

  final isLoading = false.obs;
  final Rxn<Appointment> nextAppointment = Rxn<Appointment>();

  @override
  void onInit() {
    super.onInit();
    ever<int>(_sync.revision, (_) => load());
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    try {
      final appointments = await _repository.list();
      final upcoming = appointments.where((a) => a.isUpcoming).toList()
        ..sort((a, b) => a.startTime!.compareTo(b.startTime!));
      nextAppointment.value = upcoming.isNotEmpty ? upcoming.first : null;
    } catch (_) {
      // Silent on home summary — user can still navigate to Bookings for detail/errors.
    } finally {
      isLoading.value = false;
    }
  }
}
