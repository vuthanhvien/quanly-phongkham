import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/session/session_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_icons.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/language_switcher.dart';

class HomeWelcome extends StatelessWidget {
  const HomeWelcome({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    decoration: const BoxDecoration(
      color: AppColors.primarySoft,
      borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
    ),
    child: SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Row(
          children: [
            Expanded(
              child: Obx(() {
                final customer = session.customer.value;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Chào ${customer?.fullName.split(' ').last ?? 'bạn'}',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      customer == null
                          ? 'Khám phá hành trình chăm sóc dành cho bạn'
                          : 'Cùng ${customer.fullName} chăm sóc sức khỏe mỗi ngày',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        height: 1.35,
                      ),
                    ),
                  ],
                );
              }),
            ),
            const LanguageSwitcher(),
            const SizedBox(width: 4),
            InkWell(
              onTap: () {
                if (!session.isLoggedIn) Get.toNamed(AppRoutes.phoneEntry);
              },
              borderRadius: BorderRadius.circular(99),
              child: const CircleAvatar(
                radius: 23,
                backgroundColor: Colors.white,
                child: Icon(AppIcons.profile, color: AppColors.primaryDark),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
