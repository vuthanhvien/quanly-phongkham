import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'app.dart';
import 'core/session/session_controller.dart';
import 'core/config/customer_app_config_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GetStorage.init();
  Get.put(SessionController(), permanent: true);
  final config = Get.put(CustomerAppConfigController(), permanent: true);
  await config.load();
  runApp(const CustomerApp());
}
