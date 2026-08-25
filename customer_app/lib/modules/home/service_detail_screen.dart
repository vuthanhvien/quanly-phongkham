import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../core/theme/app_colors.dart';
import '../../data/demo/clinic_content.dart';
import '../../routes/app_routes.dart';

class ServiceDetailScreen extends StatelessWidget {
  const ServiceDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Get.arguments as ClinicService;
    final detail = _plainText(
      service.content.isNotEmpty ? service.content : service.description,
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Thông tin dịch vụ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: double.infinity,
                height: 230,
                child: Image.network(
                  service.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) =>
                      const ColoredBox(color: AppColors.primarySoft),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Text(
              service.name,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            if (service.price > 0) ...[
              const SizedBox(height: 6),
              Text(
                '${service.price.toStringAsFixed(0)} đ',
                style: const TextStyle(
                  color: AppColors.accent,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 22),
            const Text(
              'Thông tin dịch vụ',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              detail,
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
                child: const Text('Đặt lịch tư vấn'),
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
