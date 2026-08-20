import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/customer.dart';

class OtpRequestResult {
  OtpRequestResult({required this.message, this.devCode});
  final String message;
  final String? devCode;
}

class OtpVerifyResult {
  OtpVerifyResult({required this.accessToken, required this.customer});
  final String accessToken;
  final Customer customer;
}

class AuthRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<OtpRequestResult> requestOtp(String phone) async {
    final response = await _dio.post(
      Endpoints.otpRequest,
      data: {'phone': phone},
    );
    final data = response.data as Map<String, dynamic>;
    return OtpRequestResult(
      message: data['message'] as String? ?? '',
      devCode: data['devCode'] as String?,
    );
  }

  Future<OtpVerifyResult> verifyOtp(String phone, String code) async {
    final response = await _dio.post(
      Endpoints.otpVerify,
      data: {'phone': phone, 'code': code},
    );
    final data = response.data as Map<String, dynamic>;
    return OtpVerifyResult(
      accessToken: data['accessToken'] as String,
      customer: Customer.fromJson(data['customer'] as Map<String, dynamic>),
    );
  }
}
