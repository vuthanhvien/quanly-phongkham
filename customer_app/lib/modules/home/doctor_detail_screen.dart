import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../data/demo/clinic_content.dart';
import '../../routes/app_routes.dart';

class DoctorDetailScreen extends StatelessWidget {
  const DoctorDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final doctor = Get.arguments as ClinicDoctor;
    return Scaffold(
      appBar: AppBar(title: const Text('Thông tin bác sĩ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: double.infinity,
                height: 260,
                child: Image.network(
                  doctor.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => ColoredBox(
                    color: Color(doctor.color),
                    child: const Center(
                      child: Icon(
                        AppIcons.person,
                        size: 88,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Text(
              doctor.name,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 5),
            Text(
              doctor.specialty,
              style: const TextStyle(
                color: AppColors.accent,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (doctor.experience.isNotEmpty) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  const Icon(
                    AppIcons.shield,
                    color: AppColors.primaryDark,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    doctor.experience,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 28),
            const Text(
              'Giới thiệu',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              _plainText(
                doctor.content.isNotEmpty
                    ? doctor.content
                    : (doctor.excerpt.isNotEmpty
                          ? doctor.excerpt
                          : '${doctor.name} chuyên ${doctor.specialty.toLowerCase()}, luôn ưu tiên tư vấn rõ ràng và xây dựng lộ trình chăm sóc phù hợp cho từng khách hàng.'),
              ),
              style: const TextStyle(
                color: AppColors.textMuted,
                height: 1.55,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Get.toNamed(AppRoutes.bookingCreate),
                child: const Text('Đặt lịch với bác sĩ'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _plainText(String value) => value
      .replaceAll(RegExp(r'<[^>]*>'), ' ')
      .replaceAll(RegExp(r'\\s+'), ' ')
      .trim();
}
