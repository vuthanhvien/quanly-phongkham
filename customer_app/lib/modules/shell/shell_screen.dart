import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_icons.dart';
import '../bookings/bookings_screen.dart';
import '../home/home_screen.dart';
import '../invoices/invoices_screen.dart';
import '../profile/profile_screen.dart';
import 'shell_controller.dart';

class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key});

  static const _pages = [HomeScreen(), BookingsScreen(), InvoicesScreen(), ProfileScreen()];

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ShellController>();
    return Obx(() {
      final index = controller.tabIndex.value;
      return Scaffold(
        body: IndexedStack(index: index, children: _pages),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: index,
          onTap: controller.changeTab,
          items: [
            BottomNavigationBarItem(
              icon: const Icon(AppIcons.home),
              activeIcon: const Icon(AppIcons.homeFill),
              label: 'Trang chủ',
            ),
            BottomNavigationBarItem(
              icon: const Icon(AppIcons.calendar),
              activeIcon: const Icon(AppIcons.calendarFill),
              label: 'Lịch hẹn',
            ),
            BottomNavigationBarItem(
              icon: const Icon(AppIcons.invoice),
              activeIcon: const Icon(AppIcons.invoiceFill),
              label: 'Hóa đơn',
            ),
            BottomNavigationBarItem(
              icon: const Icon(AppIcons.profile),
              activeIcon: const Icon(AppIcons.profileFill),
              label: 'Hồ sơ',
            ),
          ],
        ),
      );
    });
  }
}
