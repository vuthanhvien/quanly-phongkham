import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart' hide Response;
import 'package:get_storage/get_storage.dart';
import '../../routes/app_routes.dart';
import '../storage/storage_keys.dart';
import 'env.dart';

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _storage.read<String>(StorageKeys.accessToken);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            _storage.remove(StorageKeys.accessToken);
            _storage.remove(StorageKeys.customerProfile);
            if (Get.currentRoute != AppRoutes.phoneEntry) {
              Get.offAllNamed(AppRoutes.phoneEntry);
            }
          }
          handler.next(error);
        },
      ),
    );
    if (kDebugMode) _dio.interceptors.add(_ApiLogInterceptor());
  }

  static final ApiClient instance = ApiClient._internal();
  final GetStorage _storage = GetStorage();
  late final Dio _dio;

  Dio get dio => _dio;
}

/// Prints each request/response/error to the terminal. Only attached in
/// debug builds so tokens and payloads never end up in release logs.
class _ApiLogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('→ ${options.method} ${options.uri}');
    if (options.data != null) debugPrint('  body: ${options.data}');
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    debugPrint(
      '← ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.uri}',
    );
    debugPrint('  body: ${response.data}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint(
      '✗ ${err.response?.statusCode} ${err.requestOptions.method} ${err.requestOptions.uri}\n'
      '  ${err.message}\n'
      '  body: ${err.response?.data}',
    );
    handler.next(err);
  }
}
