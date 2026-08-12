import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../routes/app_routes.dart';
import '../bookings/bookings_screen.dart';
import '../chat/chat_screen.dart';
import '../home/home_screen.dart';
import '../profile/profile_screen.dart';
import 'shell_controller.dart';

class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key});

  static const _pages = [
    HomeScreen(),
    BookingsScreen(),
    SizedBox.shrink(),
    ChatScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ShellController>();
    return Obx(() {
      final index = controller.tabIndex.value;
      return Scaffold(
        body: IndexedStack(index: index, children: _pages),
        bottomNavigationBar: SafeArea(
          top: false,
          child: SizedBox(
            // BottomNavigationBar needs room for its internal item layout;
            // SafeArea then adds only the device's bottom inset (home indicator).
            height: 64,
            child: BottomNavigationBar(
              currentIndex: index,
              onTap: (selected) {
                if (selected == 2) {
                  Get.toNamed(AppRoutes.bookingCreate);
                  return;
                }
                controller.changeTab(selected);
              },
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
                  icon: Container(
                    transform: Matrix4.translationValues(0, -6, 0),
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x448D365B),
                          blurRadius: 12,
                          offset: Offset(0, 5),
                        ),
                      ],
                    ),
                    child: const Icon(AppIcons.plus, color: Colors.white),
                  ),
                  label: 'Đặt lịch',
                ),
                BottomNavigationBarItem(
                  icon: const Icon(AppIcons.chat),
                  activeIcon: const Icon(AppIcons.chatFill),
                  label: 'Tin nhắn',
                ),
                BottomNavigationBarItem(
                  icon: const Icon(AppIcons.profile),
                  activeIcon: const Icon(AppIcons.profileFill),
                  label: 'Hồ sơ',
                ),
              ],
            ),
          ),
        ),
      );
    });
  }
}
