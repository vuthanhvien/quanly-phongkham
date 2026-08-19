import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../core/config/customer_app_config_controller.dart';
import '../../data/demo/clinic_content.dart';
import '../../routes/app_routes.dart';
import '../bookings/booking_card.dart';
import '../shell/shell_controller.dart';
import 'home_controller.dart';

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
          padding: const EdgeInsets.fromLTRB(16, 56, 16, 36),
          children: [
            Row(
              children: [
                Expanded(
                  child: Obx(
                    () => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Chào ${session.customer.value?.fullName.split(' ').last ?? 'bạn'}',
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Hôm nay bạn muốn chăm sóc điều gì?',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
                const CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.primarySoft,
                  child: Icon(AppIcons.profile, color: AppColors.primaryDark),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const _ClinicHero(),
            const _ConfiguredBlocks(),
            const SizedBox(height: 28),
            _SectionTitle(
              title: 'Lịch hẹn gần nhất',
              action: 'Xem tất cả',
              onTap: () => Get.find<ShellController>().changeTab(1),
            ),
            const SizedBox(height: 10),
            Obx(() {
              if (controller.isLoading.value) {
                return const _Skeleton(height: 92);
              }
              final next = controller.nextAppointment.value;
              if (next != null) {
                return BookingCard(
                  appointment: next,
                  onTap: () =>
                      Get.toNamed(AppRoutes.bookingDetail, arguments: next.id),
                );
              }
              return _EmptyBooking(
                onTap: () => Get.toNamed(AppRoutes.bookingCreate),
              );
            }),
            const SizedBox(height: 28),
            _SectionTitle(
              title: 'Dịch vụ nổi bật',
              action: 'Khám phá',
              onTap: () {},
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 142,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: clinicServices.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (_, index) =>
                    _ServiceCard(service: clinicServices[index]),
              ),
            ),
            const SizedBox(height: 28),
            _SectionTitle(
              title: 'Đội ngũ bác sĩ',
              action: 'Xem tất cả',
              onTap: () {},
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 168,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: clinicDoctors.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (_, index) =>
                    _DoctorCard(doctor: clinicDoctors[index]),
              ),
            ),
            const SizedBox(height: 28),
            _SectionTitle(
              title: 'Mới từ phòng khám',
              action: 'Xem thêm',
              onTap: () {},
            ),
            const SizedBox(height: 12),
            ...clinicPosts.map(
              (post) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _PostCard(post: post),
              ),
            ),
            const SizedBox(height: 12),
            const _ClinicInfo(),
          ],
        ),
      ),
    );
  }
}

class _ClinicHero extends StatelessWidget {
  const _ClinicHero();
  @override
  Widget build(BuildContext context) {
    final config = Get.find<CustomerAppConfigController>();
    return Obx(() {
      final businessName = config.config['businessName'] as String? ?? '';
      final logoUrl = config.config['logoUrl'] as String? ?? '';
      final layout = config.config['layout'] as Map?;
      final showLogo = layout?['showLogo'] != false;
      return Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF2A303E), Color(0xFF4A3850)],
          ),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showLogo && logoUrl.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(logoUrl, height: 36, fit: BoxFit.contain),
              ),
              const SizedBox(height: 12),
            ],
            Text(
              businessName.isEmpty
                  ? 'YOUR WELLNESS,\nOUR DEVOTION.'
                  : businessName,
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                height: 1.08,
                fontWeight: FontWeight.w800,
                letterSpacing: -.5,
              ),
            ),
            const SizedBox(height: 13),
            const Text(
              'Chăm sóc tận tâm • Kết quả bền vững',
              style: TextStyle(color: Color(0xFFE6DDE4), fontSize: 13),
            ),
            const SizedBox(height: 20),
            FilledButton.tonal(
              onPressed: () => Get.toNamed(AppRoutes.bookingCreate),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.title,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 11,
                ),
              ),
              child: const Text('Đặt lịch tư vấn'),
            ),
          ],
        ),
      );
    });
  }
}

class _ConfiguredBlocks extends StatelessWidget {
  const _ConfiguredBlocks();

  @override
  Widget build(BuildContext context) {
    final config = Get.find<CustomerAppConfigController>();
    return Obx(() {
      final blocks = config.config['blocks'];
      if (blocks is! List) return const SizedBox.shrink();
      final layout = config.config['layout'] as Map?;
      final maxBlocks = layout?['maxHomeBlocks'] as int? ?? blocks.length;
      final visible = blocks
          .whereType<Map>()
          .where((block) => block['enabled'] != false)
          .take(maxBlocks)
          .toList();
      if (visible.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Column(
          children: visible
              .map(
                (block) => Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    '${block['title'] ?? ''}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      );
    });
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
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

class _EmptyBooking extends StatelessWidget {
  const _EmptyBooking({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(17),
      child: Row(
        children: [
          const Icon(AppIcons.calendar, color: AppColors.primaryDark),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Chưa có lịch hẹn sắp tới',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(onPressed: onTap, child: const Text('Đặt lịch')),
        ],
      ),
    ),
  );
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({required this.service});
  final ClinicService service;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 152,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                service.icon,
                style: const TextStyle(
                  color: AppColors.primaryDark,
                  fontSize: 20,
                ),
              ),
            ),
            const Spacer(),
            Text(
              service.name,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 3),
            Text(
              service.description,
              style: const TextStyle(
                fontSize: 11.5,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _DoctorCard extends StatelessWidget {
  const _DoctorCard({required this.doctor});
  final ClinicDoctor doctor;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 154,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 72,
              decoration: BoxDecoration(
                color: Color(doctor.color),
                borderRadius: BorderRadius.circular(13),
              ),
              alignment: Alignment.center,
              child: const Icon(AppIcons.person, color: Colors.white, size: 42),
            ),
            const SizedBox(height: 10),
            Text(
              doctor.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            const SizedBox(height: 2),
            Text(
              doctor.specialty,
              style: const TextStyle(
                fontSize: 11.5,
                color: AppColors.textMuted,
              ),
            ),
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
  );
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post});
  final ClinicPost post;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(AppIcons.sparkle, color: AppColors.primaryDark),
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
  );
}

class _ClinicInfo extends StatelessWidget {
  const _ClinicInfo();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: AppColors.primarySofter,
      borderRadius: BorderRadius.circular(20),
    ),
    child: const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'PHÒNG KHÁM CỦA BẠN',
          style: TextStyle(
            color: AppColors.primaryDark,
            fontSize: 10.5,
            fontWeight: FontWeight.w800,
            letterSpacing: .6,
          ),
        ),
        SizedBox(height: 7),
        Text(
          'GIS Clinic',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        SizedBox(height: 6),
        Text(
          '123 Nguyễn Văn Trỗi, Phú Nhuận, TP. Hồ Chí Minh\n08:00 – 20:00, tất cả các ngày',
          style: TextStyle(color: AppColors.textMuted, height: 1.45),
        ),
      ],
    ),
  );
}

class _Skeleton extends StatelessWidget {
  const _Skeleton({required this.height});
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
