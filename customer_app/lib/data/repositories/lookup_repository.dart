import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/branch.dart';
import '../models/doctor.dart';
import '../demo/clinic_content.dart';

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

  Future<List<ClinicService>> services() async {
    final response = await _dio.get(Endpoints.services);
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => ClinicService.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClinicDoctor>> portalDoctors() async {
    final response = await _dio.get(Endpoints.doctors);
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => ClinicDoctor.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClinicPost>> posts() => _contentList(Endpoints.posts);

  Future<List<ClinicPost>> news() => _contentList(Endpoints.news);

  Future<List<ClinicVideo>> videos() async {
    final response = await _dio.get(Endpoints.videos);
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => ClinicVideo.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClinicPost>> _contentList(String endpoint) async {
    final response = await _dio.get(endpoint);
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => ClinicPost.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
