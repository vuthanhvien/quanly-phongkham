import 'package:get/get.dart';
import '../../core/appointments/appointment_sync_controller.dart';
import '../../core/session/session_controller.dart';
import '../../data/models/appointment.dart';
import '../../data/demo/clinic_content.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/lookup_repository.dart';

class HomeController extends GetxController {
  HomeController(
    this._repository,
    this._lookupRepository,
    this._sync,
    this._session,
  );

  final AppointmentRepository _repository;
  final LookupRepository _lookupRepository;
  final AppointmentSyncController _sync;
  final SessionController _session;

  final isLoading = false.obs;
  final isLoadingContent = false.obs;
  final Rxn<Appointment> nextAppointment = Rxn<Appointment>();
  final services = <ClinicService>[].obs;
  final doctors = <ClinicDoctor>[].obs;
  final posts = <ClinicPost>[].obs;
  final news = <ClinicPost>[].obs;
  final videos = <ClinicVideo>[].obs;

  @override
  void onInit() {
    super.onInit();
    ever<int>(_sync.revision, (_) => load());
    load();
  }

  Future<void> load() async {
    await Future.wait([_loadClinicContent(), _loadAppointmentSummary()]);
  }

  Future<void> _loadClinicContent() async {
    isLoadingContent.value = true;
    try {
      final results = await Future.wait([
        _loadOrEmpty(_lookupRepository.services()),
        _loadOrEmpty(_lookupRepository.portalDoctors()),
        _loadOrEmpty(_lookupRepository.posts()),
        _loadOrEmpty(_lookupRepository.news()),
        _loadOrEmpty(_lookupRepository.videos()),
      ]);
      services.assignAll(results[0] as List<ClinicService>);
      doctors.assignAll(results[1] as List<ClinicDoctor>);
      posts.assignAll(results[2] as List<ClinicPost>);
      news.assignAll(results[3] as List<ClinicPost>);
      videos.assignAll(results[4] as List<ClinicVideo>);
    } catch (_) {
      // Keep public home usable if a tenant has not configured content yet.
      services.clear();
      doctors.clear();
      posts.clear();
      news.clear();
      videos.clear();
    } finally {
      isLoadingContent.value = false;
    }
  }

  /// Public content sources are independent. A tenant can publish Posts before
  /// configuring Video/Service/Doctor, so one unavailable source must not hide
  /// all the other content on Home.
  Future<List<T>> _loadOrEmpty<T>(Future<List<T>> request) async {
    try {
      return await request;
    } catch (_) {
      return <T>[];
    }
  }

  Future<void> _loadAppointmentSummary() async {
    if (!_session.isLoggedIn) {
      nextAppointment.value = null;
      isLoading.value = false;
      return;
    }
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
