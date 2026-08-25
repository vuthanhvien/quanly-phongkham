import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_icons.dart';
import '../../../data/demo/clinic_content.dart';
import '../../../routes/app_routes.dart';

class ServiceCard extends StatelessWidget {
  const ServiceCard({super.key, required this.service});
  final ClinicService service;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 186,
    child: Card(
      child: InkWell(
        onTap: () => Get.toNamed(AppRoutes.serviceDetail, arguments: service),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: Image.network(
                    service.imageUrl,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: AppColors.primarySoft,
                      alignment: Alignment.center,
                      child: Text(
                        service.icon,
                        style: const TextStyle(
                          color: AppColors.primaryDark,
                          fontSize: 32,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                service.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 3),
              Text(
                service.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class DoctorCard extends StatelessWidget {
  const DoctorCard({super.key, required this.doctor});
  final ClinicDoctor doctor;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 170,
    child: Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => Get.toNamed(AppRoutes.doctorDetail, arguments: doctor),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 96,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(
                    doctor.imageUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    errorBuilder: (_, _, _) => Container(
                      color: Color(doctor.color),
                      alignment: Alignment.center,
                      child: const Icon(
                        AppIcons.person,
                        color: Colors.white,
                        size: 42,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 9),
              Text(
                doctor.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                doctor.specialty,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 2),
              if (doctor.experience.isNotEmpty)
                Text(
                  doctor.experience,
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: AppColors.primaryDark,
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}

class PostCard extends StatelessWidget {
  const PostCard({super.key, required this.post});
  final ClinicPost post;
  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => Get.toNamed(AppRoutes.newsDetail, arguments: post),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            SizedBox(
              width: 72,
              height: 72,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  post.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    color: AppColors.primarySoft,
                    child: const Icon(
                      AppIcons.sparkle,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    post.category,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    post.readTime,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
