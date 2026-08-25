import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../core/session/session_controller.dart';
import '../../data/demo/clinic_content.dart';
import '../../routes/app_routes.dart';
import '../bookings/booking_card.dart';
import '../shell/shell_controller.dart';
import 'home_controller.dart';
import 'widgets/home_content_cards.dart';
import 'widgets/home_cta_carousel.dart';
import 'widgets/home_header.dart';
import 'widgets/home_section_widgets.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<HomeController>();
    final session = Get.find<SessionController>();
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: controller.load,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            HomeWelcome(session: session),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  HomeCtaCarousel(isLoggedIn: session.isLoggedIn),
                  const SizedBox(height: 28),
                  SectionTitle(
                    title: 'Lịch hẹn gần nhất',
                    action: 'Xem tất cả',
                    onTap: () => session.isLoggedIn
                        ? Get.find<ShellController>().changeTab(1)
                        : Get.toNamed(AppRoutes.phoneEntry),
                  ),
                  const SizedBox(height: 10),
                  Obx(() {
                    if (!session.isLoggedIn) {
                      return EmptyBooking(
                        onTap: () => Get.toNamed(AppRoutes.phoneEntry),
                        message: 'Đăng nhập để xem và quản lý lịch hẹn của bạn',
                      );
                    }
                    if (controller.isLoading.value) {
                      return const Skeleton(height: 92);
                    }
                    final next = controller.nextAppointment.value;
                    if (next != null) {
                      return BookingCard(
                        appointment: next,
                        onTap: () => Get.toNamed(
                          AppRoutes.bookingDetail,
                          arguments: next.id,
                        ),
                      );
                    }
                    return EmptyBooking(
                      onTap: () => Get.toNamed(AppRoutes.bookingCreate),
                    );
                  }),
                  const SizedBox(height: 28),
                  SectionTitle(
                    title: 'Dịch vụ nổi bật',
                    action: 'Khám phá',
                    onTap: () => Get.toNamed(AppRoutes.services),
                  ),
                  const SizedBox(height: 12),
                  Obx(
                    () => ContentSection(
                      isLoading: controller.isLoadingContent.value,
                      isEmpty: controller.services.isEmpty,
                      emptyMessage: 'Chưa có dịch vụ để hiển thị',
                      child: ContentCarousel(
                        height: 236,
                        viewportFraction: .56,
                        itemCount: controller.services.length,
                        itemBuilder: (index) =>
                            ServiceCard(service: controller.services[index]),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  SectionTitle(
                    title: 'Đội ngũ bác sĩ',
                    action: 'Xem tất cả',
                    onTap: () => Get.toNamed(AppRoutes.doctors),
                  ),
                  const SizedBox(height: 12),
                  Obx(() {
                    final doctors = controller.doctors.take(5).toList();
                    return ContentSection(
                      isLoading: controller.isLoadingContent.value,
                      isEmpty: doctors.isEmpty,
                      emptyMessage: 'Chưa có bác sĩ để hiển thị',
                      child: ContentCarousel(
                        height: 194,
                        viewportFraction: .5,
                        itemWidth: 170,
                        itemCount: doctors.length,
                        itemBuilder: (index) =>
                            DoctorCard(doctor: doctors[index]),
                      ),
                    );
                  }),
                  const SizedBox(height: 28),
                  _PostSection(
                    title: 'Posts mới',
                    action: 'Xem thêm',
                    route: AppRoutes.posts,
                    posts: controller.posts,
                  ),
                  const SizedBox(height: 16),
                  _PostSection(
                    title: 'Tin tức mới',
                    action: 'Xem thêm',
                    route: AppRoutes.news,
                    posts: controller.news,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PostSection extends StatelessWidget {
  const _PostSection({
    required this.title,
    required this.action,
    required this.route,
    required this.posts,
  });

  final String title, action, route;
  final RxList<ClinicPost> posts;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      SectionTitle(
        title: title,
        action: action,
        onTap: () => Get.toNamed(route),
      ),
      const SizedBox(height: 12),
      Obx(
        () => Column(
          children: posts
              .take(3)
              .map<Widget>(
                (post) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: PostCard(post: post),
                ),
              )
              .toList(),
        ),
      ),
    ],
  );
}
