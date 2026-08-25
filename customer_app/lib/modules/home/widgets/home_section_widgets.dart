import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_icons.dart';

class ContentCarousel extends StatefulWidget {
  const ContentCarousel({
    super.key,
    required this.height,
    required this.viewportFraction,
    required this.itemCount,
    required this.itemBuilder,
    this.itemWidth,
  });
  final double height, viewportFraction;
  final int itemCount;
  final Widget Function(int index) itemBuilder;
  final double? itemWidth;
  @override
  State<ContentCarousel> createState() => _ContentCarouselState();
}

class _ContentCarouselState extends State<ContentCarousel> {
  var _currentPage = 0;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      LayoutBuilder(
        builder: (context, constraints) {
          final viewportFraction = widget.itemWidth == null
              ? widget.viewportFraction
              : ((widget.itemWidth! + 10) / constraints.maxWidth)
                    .clamp(.1, 1.0)
                    .toDouble();
          return SizedBox(
            height: widget.height - 18,
            child: CarouselSlider.builder(
              itemCount: widget.itemCount,
              itemBuilder: (_, index, _) => Padding(
                padding: const EdgeInsets.only(right: 10),
                child: widget.itemBuilder(index),
              ),
              options: CarouselOptions(
                height: widget.height - 18,
                viewportFraction: viewportFraction,
                padEnds: false,
                enableInfiniteScroll: false,
                onPageChanged: (index, _) =>
                    setState(() => _currentPage = index),
              ),
            ),
          );
        },
      ),
      const SizedBox(height: 7),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(
          widget.itemCount,
          (index) => AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: index == _currentPage ? 12 : 4,
            height: 4,
            decoration: BoxDecoration(
              color: index == _currentPage
                  ? AppColors.accent
                  : AppColors.border,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),
      ),
    ],
  );
}

class ContentSection extends StatelessWidget {
  const ContentSection({
    super.key,
    required this.isLoading,
    required this.isEmpty,
    required this.emptyMessage,
    required this.child,
  });
  final bool isLoading, isEmpty;
  final String emptyMessage;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    if (isLoading && isEmpty) return const Skeleton(height: 130);
    if (isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(
          emptyMessage,
          style: const TextStyle(color: AppColors.textMuted),
        ),
      );
    }
    return child;
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle({
    super.key,
    required this.title,
    required this.action,
    required this.onTap,
  });
  final String title, action;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
      ),
      TextButton(onPressed: onTap, child: Text(action)),
    ],
  );
}

class EmptyBooking extends StatelessWidget {
  const EmptyBooking({super.key, required this.onTap, this.message});
  final VoidCallback onTap;
  final String? message;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(17),
      child: Row(
        children: [
          const Icon(AppIcons.calendar, color: AppColors.primaryDark),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message ?? 'Chưa có lịch hẹn sắp tới',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: onTap,
            child: Text(message == null ? 'Đặt lịch' : 'Đăng nhập'),
          ),
        ],
      ),
    ),
  );
}

class Skeleton extends StatelessWidget {
  const Skeleton({super.key, required this.height});
  final double height;
  @override
  Widget build(BuildContext context) => Container(
    height: height,
    decoration: BoxDecoration(
      color: AppColors.border.withValues(alpha: .55),
      borderRadius: BorderRadius.circular(14),
    ),
  );
}
