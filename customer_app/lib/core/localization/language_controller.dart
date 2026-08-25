import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';

class LanguageController extends GetxController {
  static const _storageKey = 'customer_app_language';
  final _storage = GetStorage();
  final locale = const Locale('vi', 'VN').obs;

  @override
  void onInit() {
    super.onInit();
    final saved = _storage.read<String>(_storageKey);
    if (saved == 'en') locale.value = const Locale('en', 'US');
  }

  void setLanguage(String code) {
    final next = code == 'en'
        ? const Locale('en', 'US')
        : const Locale('vi', 'VN');
    locale.value = next;
    _storage.write(_storageKey, next.languageCode);
    Get.updateLocale(next);
  }
}
