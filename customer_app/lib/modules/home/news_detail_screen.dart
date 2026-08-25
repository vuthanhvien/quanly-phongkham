import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../data/demo/clinic_content.dart';

class NewsDetailScreen extends StatelessWidget {
  const NewsDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final post = Get.arguments as ClinicPost;
    final body = _htmlToPlainText(post.content);
    return Scaffold(
      appBar: AppBar(title: const Text('Tin từ phòng khám')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                height: 230,
                width: double.infinity,
                child: Image.network(
                  post.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const ColoredBox(
                    color: AppColors.primarySoft,
                    child: Center(
                      child: Icon(
                        AppIcons.sparkle,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Text(
              post.category,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              post.title,
              style: const TextStyle(
                fontSize: 25,
                fontWeight: FontWeight.w800,
                height: 1.18,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              post.readTime,
              style: const TextStyle(color: AppColors.textMuted),
            ),
            const SizedBox(height: 26),
            Text(
              post.excerpt,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              body.isEmpty ? post.excerpt : body,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textMuted,
                height: 1.65,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _htmlToPlainText(String value) => value
    .replaceAll(RegExp(r'<[^>]*>'), ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();
