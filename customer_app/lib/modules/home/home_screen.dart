import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../routes/app_routes.dart';
import '../../widgets/loading_view.dart';
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
      appBar: AppBar(title: const Text('Trang chủ')),
      body: RefreshIndicator(
        onRefresh: controller.load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Obx(() {
              final name = session.customer.value?.fullName ?? '';
              return Text(
                'Xin chào, $name',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              );
            }),
            const SizedBox(height: 4),
            const Text('Chúc bạn một ngày tốt lành', style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
            const SizedBox(height: 20),
            const Text('Lịch hẹn sắp tới', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            Obx(() {
              if (controller.isLoading.value) return const SizedBox(height: 80, child: LoadingView());
              final next = controller.nextAppointment.value;
              if (next == null) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        const Icon(AppIcons.calendar, color: AppColors.textMuted),
                        const SizedBox(width: 12),
                        const Expanded(child: Text('Bạn chưa có lịch hẹn nào sắp tới', style: TextStyle(color: AppColors.textMuted))),
                      ],
                    ),
                  ),
                );
              }
              return BookingCard(
                appointment: next,
                onTap: () => Get.toNamed(AppRoutes.bookingDetail, arguments: next.id),
              );
            }),
            const SizedBox(height: 24),
            const Text('Thao tác nhanh', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    icon: AppIcons.plus,
                    label: 'Đặt lịch mới',
                    onTap: () => Get.toNamed(AppRoutes.bookingCreate)?.then((_) => controller.load()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    icon: AppIcons.invoice,
                    label: 'Hóa đơn',
                    onTap: () => Get.find<ShellController>().changeTab(2),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    icon: AppIcons.profile,
                    label: 'Hồ sơ',
                    onTap: () => Get.find<ShellController>().changeTab(3),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, color: AppColors.primaryDark, size: 24),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
