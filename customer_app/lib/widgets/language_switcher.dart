import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../core/localization/language_controller.dart';
import '../core/theme/app_colors.dart';
import 'bottom_sheet_select.dart';

class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key, this.color = AppColors.textMuted});

  final Color color;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'language'.tr,
    icon: Icon(Icons.language_outlined, color: color),
    onPressed: () async {
      final controller = Get.find<LanguageController>();
      final language = await showBottomSheetSelect<String>(
        context: context,
        title: 'language'.tr,
        value: controller.locale.value.languageCode,
        options: [
          BottomSheetOption(value: 'vi', label: 'vietnamese'.tr),
          BottomSheetOption(value: 'en', label: 'english'.tr),
        ],
      );
      if (language != null) controller.setLanguage(language);
    },
  );
}
