import 'package:get/get.dart';

/// A small app-wide signal for appointment mutations.
///
/// The home summary and appointment list retain their own data, but both
/// reload when a booking is created, cancelled, or otherwise changed.
class AppointmentSyncController extends GetxController {
  final revision = 0.obs;

  void requestRefresh() => revision.value++;
}
