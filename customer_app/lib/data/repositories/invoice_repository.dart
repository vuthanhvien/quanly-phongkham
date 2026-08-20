import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/invoice.dart';

class InvoiceRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Invoice>> list({int page = 1, int pageSize = 50}) async {
    final response = await _dio.get(
      Endpoints.invoices,
      queryParameters: {'page': page, 'pageSize': pageSize},
    );
    final data =
        (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .map((item) => Invoice.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Invoice> detail(String id) async {
    final response = await _dio.get(Endpoints.invoice(id));
    return Invoice.fromJson(
      (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
    );
  }
}
