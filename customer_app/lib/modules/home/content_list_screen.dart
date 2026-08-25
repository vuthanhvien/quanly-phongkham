import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../data/demo/clinic_content.dart';
import '../../routes/app_routes.dart';
import 'home_controller.dart';

class ContentListScreen extends StatelessWidget {
  const ContentListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final route = Get.currentRoute;
    final isServices = route == AppRoutes.services;
    final isDoctors = route == AppRoutes.doctors;
    final isPosts = route == AppRoutes.posts;
    final home = Get.find<HomeController>();
    final title = isServices
        ? 'Dịch vụ'
        : isDoctors
        ? 'Đội ngũ bác sĩ'
        : isPosts
        ? 'Posts'
        : 'Tin từ phòng khám';
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Obx(() {
        final List<Object> items = isServices
            ? List<Object>.from(home.services)
            : isDoctors
            ? List<Object>.from(home.doctors)
            : isPosts
            ? List<Object>.from(home.posts)
            : List<Object>.from(home.news);
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, index) {
            final item = items[index];
            final (title, subtitle, imageUrl) = switch (item) {
              ClinicService service => (
                service.name,
                service.price > 0
                    ? '${service.description} · ${service.price.toStringAsFixed(0)} đ'
                    : service.description,
                service.imageUrl,
              ),
              ClinicDoctor doctor => (
                doctor.name,
                '${doctor.specialty} · ${doctor.experience}',
                doctor.imageUrl,
              ),
              ClinicPost post => (post.title, post.excerpt, post.imageUrl),
              _ => ('', '', ''),
            };
            return Card(
              child: ListTile(
                onTap: item is ClinicService
                    ? () =>
                          Get.toNamed(AppRoutes.serviceDetail, arguments: item)
                    : isDoctors
                    ? () => Get.toNamed(AppRoutes.doctorDetail, arguments: item)
                    : item is ClinicPost
                    ? () => Get.toNamed(AppRoutes.newsDetail, arguments: item)
                    : null,
                contentPadding: const EdgeInsets.all(12),
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(
                    imageUrl,
                    width: 62,
                    height: 62,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) =>
                        const ColoredBox(color: AppColors.primarySoft),
                  ),
                ),
                title: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(
                  Icons.chevron_right,
                  color: AppColors.textMuted,
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
