import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../data/demo/clinic_content.dart';
import '../../routes/app_routes.dart';
import '../../widgets/language_switcher.dart';
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
          padding: EdgeInsets.zero,
          children: [
            _HomeWelcome(session: session),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _HomeCtaCarousel(isLoggedIn: session.isLoggedIn),
                  const SizedBox(height: 28),
                  _SectionTitle(
                    title: 'Lịch hẹn gần nhất',
                    action: 'Xem tất cả',
                    onTap: () => session.isLoggedIn
                        ? Get.find<ShellController>().changeTab(1)
                        : Get.toNamed(AppRoutes.phoneEntry),
                  ),
                  const SizedBox(height: 10),
                  Obx(() {
                    if (!session.isLoggedIn) {
                      return _EmptyBooking(
                        onTap: () => Get.toNamed(AppRoutes.phoneEntry),
                        message: 'Đăng nhập để xem và quản lý lịch hẹn của bạn',
                      );
                    }
                    if (controller.isLoading.value) {
                      return const _Skeleton(height: 92);
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
                    return _EmptyBooking(
                      onTap: () => Get.toNamed(AppRoutes.bookingCreate),
                    );
                  }),
                  const SizedBox(height: 28),
                  _SectionTitle(
                    title: 'Dịch vụ nổi bật',
                    action: 'Khám phá',
                    onTap: () => Get.toNamed(AppRoutes.services),
                  ),
                  const SizedBox(height: 12),
                  Obx(
                    () => _ContentSection(
                      isLoading: controller.isLoadingContent.value,
                      isEmpty: controller.services.isEmpty,
                      emptyMessage: 'Chưa có dịch vụ để hiển thị',
                      child: _ContentCarousel(
                        height: 160,
                        viewportFraction: .46,
                        itemCount: controller.services.length,
                        itemBuilder: (index) =>
                            _ServiceCard(service: controller.services[index]),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  _SectionTitle(
                    title: 'Đội ngũ bác sĩ',
                    action: 'Xem tất cả',
                    onTap: () => Get.toNamed(AppRoutes.doctors),
                  ),
                  const SizedBox(height: 12),
                  Obx(() {
                    final doctors = controller.doctors.take(5).toList();
                    return _ContentSection(
                      isLoading: controller.isLoadingContent.value,
                      isEmpty: doctors.isEmpty,
                      emptyMessage: 'Chưa có bác sĩ để hiển thị',
                      child: _ContentCarousel(
                        height: 220,
                        viewportFraction: .5,
                        itemCount: doctors.length,
                        itemBuilder: (index) =>
                            _DoctorCard(doctor: doctors[index]),
                      ),
                    );
                  }),
                  const SizedBox(height: 28),
                  _SectionTitle(
                    title: 'Posts mới',
                    action: 'Xem thêm',
                    onTap: () => Get.toNamed(AppRoutes.posts),
                  ),
                  const SizedBox(height: 12),
                  Obx(
                    () => Column(
                      children: controller.posts
                          .take(3)
                          .map(
                            (post) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _PostCard(post: post),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _SectionTitle(
                    title: 'Tin tức mới',
                    action: 'Xem thêm',
                    onTap: () => Get.toNamed(AppRoutes.news),
                  ),
                  const SizedBox(height: 12),
                  Obx(
                    () => Column(
                      children: controller.news
                          .take(3)
                          .map(
                            (news) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _PostCard(post: news),
                            ),
                          )
                          .toList(),
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
}

class _HomeWelcome extends StatelessWidget {
  const _HomeWelcome({required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    decoration: BoxDecoration(
      color: AppColors.primarySoft,
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
    ),
    child: SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Row(
          children: [
            Expanded(
              child: Obx(() {
                final customer = session.customer.value;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Chào ${customer?.fullName.split(' ').last ?? 'bạn'}',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      customer == null
                          ? 'Khám phá hành trình chăm sóc dành cho bạn'
                          : 'Cùng ${customer.fullName} chăm sóc sức khỏe mỗi ngày',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        height: 1.35,
                      ),
                    ),
                  ],
                );
              }),
            ),
            const LanguageSwitcher(),
            const SizedBox(width: 4),
            InkWell(
              onTap: () {
                if (!session.isLoggedIn) Get.toNamed(AppRoutes.phoneEntry);
              },
              borderRadius: BorderRadius.circular(99),
              child: const CircleAvatar(
                radius: 23,
                backgroundColor: Colors.white,
                child: Icon(AppIcons.profile, color: AppColors.primaryDark),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _HomeCtaCarousel extends StatefulWidget {
  const _HomeCtaCarousel({required this.isLoggedIn});

  final bool isLoggedIn;

  @override
  State<_HomeCtaCarousel> createState() => _HomeCtaCarouselState();
}

class _HomeCtaCarouselState extends State<_HomeCtaCarousel> {
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
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            slides.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: index == _currentPage ? 16 : 5,
              height: 5,
              decoration: BoxDecoration(
                color: index == _currentPage
                    ? AppColors.primaryDark
                    : AppColors.border,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ContentCarousel extends StatefulWidget {
  const _ContentCarousel({
    required this.height,
    required this.viewportFraction,
    required this.itemCount,
    required this.itemBuilder,
  });

  final double height;
  final double viewportFraction;
  final int itemCount;
  final Widget Function(int index) itemBuilder;

  @override
  State<_ContentCarousel> createState() => _ContentCarouselState();
}

class _ContentSection extends StatelessWidget {
  const _ContentSection({
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
    if (isLoading && isEmpty) return const _Skeleton(height: 130);
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

class _ContentCarouselState extends State<_ContentCarousel> {
  var _currentPage = 0;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      SizedBox(
        height: widget.height - 18,
        child: CarouselSlider.builder(
          itemCount: widget.itemCount,
          itemBuilder: (_, index, _) => Padding(
            padding: const EdgeInsets.only(right: 10),
            child: widget.itemBuilder(index),
          ),
          options: CarouselOptions(
            height: widget.height - 18,
            viewportFraction: widget.viewportFraction,
            padEnds: false,
            enableInfiniteScroll: false,
            onPageChanged: (index, _) => setState(() => _currentPage = index),
          ),
        ),
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
  const _EmptyBooking({required this.onTap, this.message});
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

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({required this.service});
  final ClinicService service;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 152,
    child: Card(
      child: InkWell(
        onTap: () => Get.toNamed(AppRoutes.serviceDetail, arguments: service),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Stack(
            children: [
              Positioned(
                right: -18,
                bottom: -18,
                child: Opacity(
                  opacity: .16,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(60),
                    child: Image.network(
                      service.imageUrl,
                      width: 96,
                      height: 96,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              ),
              Column(
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
            ],
          ),
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

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post});
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
