import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/branch.dart';
import '../models/doctor.dart';

class LookupRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Branch>> branches() async {
    final response = await _dio.get(Endpoints.branches);
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => Branch.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Doctor>> doctors() async {
    final response = await _dio.get(Endpoints.doctors);
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => Doctor.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
