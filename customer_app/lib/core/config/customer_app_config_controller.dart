import 'package:dio/dio.dart';
import 'package:get/get.dart';
import '../api/api_client.dart';

class CustomerAppConfigController extends GetxController {
  final config = <String, dynamic>{
    'appTitle': 'Đặt lịch khám',
    'features': {
      'appointments': true,
      'chat': true,
      'invoices': true,
      'profile': true,
    },
    'bottomMenu': [
      {'key': 'home', 'enabled': true},
      {'key': 'bookings', 'enabled': true},
      {'key': 'booking-create', 'enabled': true, 'primary': true},
      {'key': 'chat', 'enabled': true},
      {'key': 'profile', 'enabled': true},
    ],
  }.obs;

  Future<void> load() async {
    try {
      final response = await ApiClient.instance.dio.get(
        '/settings/customer-app',
      );
      final data = response.data is Map ? response.data['data'] : null;
      if (data is Map) {
        config.assignAll({...config, ...Map<String, dynamic>.from(data)});
      }
    } on DioException {
      // The app remains usable with the build-time defaults when offline.
    }
  }

  String get appTitle => config['appTitle'] as String? ?? 'Đặt lịch khám';

  bool featureEnabled(String key) =>
      (config['features'] as Map?)?[key] != false;

  bool menuEnabled(String key) {
    final menus = config['bottomMenu'];
    if (menus is! List) return true;
    final item = menus.whereType<Map>().cast<Map?>().firstWhere(
      (value) => value?['key'] == key,
      orElse: () => null,
    );
    return item?['enabled'] != false;
  }

  String menuLabel(String key, String fallback) {
    final menus = config['bottomMenu'];
    if (menus is! List) return fallback;
    final item = menus.whereType<Map>().cast<Map?>().firstWhere(
      (value) => value?['key'] == key,
      orElse: () => null,
    );
    return item?['label'] as String? ?? fallback;
  }
}
