import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/customer.dart';

class CustomerRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<Customer> me() async {
    final response = await _dio.get(Endpoints.me);
    return Customer.fromJson(
      (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
    );
  }

  Future<Customer> updateMe(Map<String, dynamic> payload) async {
    final response = await _dio.patch(Endpoints.me, data: payload);
    return Customer.fromJson(
      (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
    );
  }
}
