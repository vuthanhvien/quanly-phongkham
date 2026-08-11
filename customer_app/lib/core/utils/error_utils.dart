import 'package:dio/dio.dart';

String describeError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) return data['message'] as String;
    if (data is Map && data['message'] is List && (data['message'] as List).isNotEmpty) {
      return (data['message'] as List).first.toString();
    }
    if (error.type == DioExceptionType.connectionTimeout || error.type == DioExceptionType.connectionError) {
      return 'Không thể kết nối đến máy chủ, vui lòng thử lại';
    }
    return 'Đã có lỗi xảy ra, vui lòng thử lại';
  }
  return error.toString();
}
