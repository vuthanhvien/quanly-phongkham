import 'package:get/get.dart';
import '../../data/models/appointment.dart';
import '../../data/repositories/appointment_repository.dart';

class HomeController extends GetxController {
  HomeController(this._repository);

  final AppointmentRepository _repository;

  final isLoading = false.obs;
  final Rxn<Appointment> nextAppointment = Rxn<Appointment>();

  @override
  void onInit() {
    super.onInit();
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
