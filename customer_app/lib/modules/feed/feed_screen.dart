import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../core/theme/app_colors.dart';
import '../../data/demo/clinic_content.dart';
import '../home/home_controller.dart';
import '../../routes/app_routes.dart';

class FeedScreen extends StatelessWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final home = Get.find<HomeController>();
    return Scaffold(
      appBar: AppBar(title: const Text('Feed'), centerTitle: true),
      body: Obx(() {
        final items = <Object>[...home.videos, ...home.posts, ...home.news];
        if (items.isEmpty) {
          return const Center(child: Text('Chưa có nội dung mới'));
        }
        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, index) => _FeedItem(item: items[index]),
        );
      }),
    );
  }
}

class _FeedItem extends StatelessWidget {
  const _FeedItem({required this.item});
  final Object item;

  @override
  Widget build(BuildContext context) {
    final isVideo = item is ClinicVideo;
    final title = isVideo
        ? (item as ClinicVideo).title
        : (item as ClinicPost).title;
    final excerpt = isVideo
        ? (item as ClinicVideo).excerpt
        : (item as ClinicPost).excerpt;
    final imageUrl = isVideo
        ? (item as ClinicVideo).imageUrl
        : (item as ClinicPost).imageUrl;
    final type = isVideo ? 'VIDEO NGẮN' : (item as ClinicPost).category;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: isVideo
          ? () => Get.snackbar(
              'Video ngắn',
              (item as ClinicVideo).videoUrl.isEmpty
                  ? 'Video đang được cập nhật'
                  : (item as ClinicVideo).videoUrl,
            )
          : () => Get.toNamed(AppRoutes.newsDetail, arguments: item),
      child: Ink(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(
                      imageUrl,
                      width: 92,
                      height: 92,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const ColoredBox(
                        color: AppColors.primarySoft,
                        child: SizedBox(width: 92, height: 92),
                      ),
                    ),
                  ),
                  if (isVideo)
                    const Positioned.fill(
                      child: Center(
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: Colors.black45,
                          child: Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      type,
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      excerpt,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 13,
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
}
