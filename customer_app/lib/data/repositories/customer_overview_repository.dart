import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../models/customer_overview.dart';

class CustomerOverviewRepository {
  Future<CustomerOverview> get() async {
    final response = await ApiClient.instance.dio.get(
      Endpoints.customerOverview,
    );
    return CustomerOverview.fromJson(
      Map<String, dynamic>.from((response.data as Map)['data'] as Map),
    );
  }
}
