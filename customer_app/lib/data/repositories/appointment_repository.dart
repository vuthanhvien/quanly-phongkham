import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/appointment.dart';

class AppointmentRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Appointment>> list({int page = 1, int pageSize = 50}) async {
    final response = await _dio.get(
      Endpoints.appointments,
      queryParameters: {'page': page, 'pageSize': pageSize},
    );
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => Appointment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Appointment> detail(String id) async {
    final response = await _dio.get(Endpoints.appointment(id));
    return Appointment.fromJson(
      (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
    );
  }

  Future<Appointment> create({
    required String branchId,
    String? type,
    required DateTime startTime,
    required DateTime endTime,
    String? doctorStaffId,
    String? roomId,
    String? note,
  }) async {
    final response = await _dio.post(
      Endpoints.appointments,
      data: {
        'branchId': branchId,
        'type': ?type,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
        'doctorStaffId': ?doctorStaffId,
        'roomId': ?roomId,
        'note': ?note,
      },
    );
    return Appointment.fromJson(
      (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
    );
  }

  Future<Appointment> cancel(String id) async {
    final response = await _dio.patch(Endpoints.cancelAppointment(id));
    return Appointment.fromJson(
      (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
    );
  }
}
