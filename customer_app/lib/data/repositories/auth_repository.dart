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

  Future<OtpVerifyResult> loginWithEmail(String email, String password) async {
    final response = await _dio.post(
      Endpoints.emailLogin,
      data: {'email': email, 'password': password},
    );
    final data = response.data as Map<String, dynamic>;
    return OtpVerifyResult(
      accessToken: data['accessToken'] as String,
      customer: Customer.fromJson(data['customer'] as Map<String, dynamic>),
    );
  }

  Future<OtpRequestResult> requestPhoneRegistration(
    String fullName,
    String phone,
  ) async {
    final response = await _dio.post(
      Endpoints.registerPhoneRequest,
      data: {'fullName': fullName, 'phone': phone},
    );
    final data = response.data as Map<String, dynamic>;
    return OtpRequestResult(
      message: data['message'] as String? ?? '',
      devCode: data['devCode'] as String?,
    );
  }

  Future<OtpVerifyResult> verifyPhoneRegistration(
    String fullName,
    String phone,
    String code,
  ) async {
    final response = await _dio.post(
      Endpoints.registerPhoneVerify,
      data: {'fullName': fullName, 'phone': phone, 'code': code},
    );
    return _sessionResult(response.data as Map<String, dynamic>);
  }

  Future<OtpVerifyResult> registerWithEmail(
    String fullName,
    String email,
    String password,
  ) async {
    final response = await _dio.post(
      Endpoints.registerEmail,
      data: {'fullName': fullName, 'email': email, 'password': password},
    );
    return _sessionResult(response.data as Map<String, dynamic>);
  }

  OtpVerifyResult _sessionResult(Map<String, dynamic> data) => OtpVerifyResult(
    accessToken: data['accessToken'] as String,
    customer: Customer.fromJson(data['customer'] as Map<String, dynamic>),
  );
}
