import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/theme/app_colors.dart';
import '../../../routes/app_routes.dart';

class HomeCtaCarousel extends StatefulWidget {
  const HomeCtaCarousel({super.key, required this.isLoggedIn});

  final bool isLoggedIn;

  @override
  State<HomeCtaCarousel> createState() => _HomeCtaCarouselState();
}

class _HomeCtaCarouselState extends State<HomeCtaCarousel> {
  var _currentPage = 0;

  @override
  Widget build(BuildContext context) {
    final slides = [
      _CtaSlide(
        imageUrl:
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1100&q=80',
        title: 'Đặt lịch tư vấn',
        description: 'Chọn thời gian phù hợp để đội ngũ phòng khám hỗ trợ bạn.',
        button: 'Đặt lịch ngay',
        onTap: () => widget.isLoggedIn
            ? Get.toNamed(AppRoutes.bookingCreate)
            : Get.toNamed(AppRoutes.phoneEntry),
      ),
      _CtaSlide(
        imageUrl:
            'https://images.unsplash.com/photo-1576091160399-112ba8d25d6?auto=format&fit=crop&w=1100&q=80',
        title: 'Tìm dịch vụ phù hợp',
        description: 'Khám phá các giải pháp chăm sóc được thiết kế cho bạn.',
        button: 'Xem dịch vụ',
        onTap: () => Get.toNamed(AppRoutes.services),
      ),
      _CtaSlide(
        imageUrl:
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1100&q=80',
        title: 'Gặp đội ngũ bác sĩ',
        description: 'Tìm hiểu chuyên môn và người đồng hành cùng bạn.',
        button: 'Xem bác sĩ',
        onTap: () => Get.toNamed(AppRoutes.doctors),
      ),
    ];
    return Column(
      children: [
        CarouselSlider.builder(
          itemCount: slides.length,
          itemBuilder: (_, index, _) => slides[index],
          options: CarouselOptions(
            height: 190,
            viewportFraction: .9,
            padEnds: false,
            enableInfiniteScroll: false,
            onPageChanged: (index, _) => setState(() => _currentPage = index),
          ),
        ),
        const SizedBox(height: 10),
        _Dots(activeIndex: _currentPage, count: slides.length, activeWidth: 16),
      ],
    );
  }
}

class _CtaSlide extends StatelessWidget {
  const _CtaSlide({
    required this.imageUrl,
    required this.title,
    required this.description,
    required this.button,
    required this.onTap,
  });
  final String imageUrl, title, description, button;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 12),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const ColoredBox(color: AppColors.title),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x15000000), Color(0xD91F2430)],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xE6FFFFFF),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton(
                  onPressed: onTap,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.title,
                  ),
                  child: Text(button),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _Dots extends StatelessWidget {
  const _Dots({
    required this.activeIndex,
    required this.count,
    required this.activeWidth,
  });
  final int activeIndex, count;
  final double activeWidth;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: List.generate(
      count,
      (index) => AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.symmetric(horizontal: 3),
        width: index == activeIndex ? activeWidth : 5,
        height: 5,
        decoration: BoxDecoration(
          color: index == activeIndex
              ? AppColors.primaryDark
              : AppColors.border,
          borderRadius: BorderRadius.circular(99),
        ),
      ),
    ),
  );
}
