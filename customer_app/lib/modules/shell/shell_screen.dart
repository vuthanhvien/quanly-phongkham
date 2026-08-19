import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/config/customer_app_config_controller.dart';
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
    final config = Get.find<CustomerAppConfigController>();
    return Obx(() {
      final index = controller.tabIndex.value;
      return Scaffold(
        body: IndexedStack(index: index, children: _pages),
        bottomNavigationBar: _ClinicBottomBar(
          selectedIndex: index,
          onChanged: controller.changeTab,
          onBook: () => Get.toNamed(AppRoutes.bookingCreate),
          showBookings:
              config.featureEnabled('appointments') &&
              config.menuEnabled('bookings'),
          showChat: config.featureEnabled('chat') && config.menuEnabled('chat'),
          showProfile:
              config.featureEnabled('profile') && config.menuEnabled('profile'),
          showBook:
              config.featureEnabled('appointments') &&
              config.menuEnabled('booking-create'),
          bookingLabel: config.menuLabel('bookings', 'Lịch hẹn'),
          chatLabel: config.menuLabel('chat', 'Tin nhắn'),
          profileLabel: config.menuLabel('profile', 'Cá nhân'),
          homeLabel: config.menuLabel('home', 'Trang chủ'),
        ),
      );
    });
  }
}

class _ClinicBottomBar extends StatelessWidget {
  const _ClinicBottomBar({
    required this.selectedIndex,
    required this.onChanged,
    required this.onBook,
    required this.showBookings,
    required this.showChat,
    required this.showProfile,
    required this.showBook,
    required this.bookingLabel,
    required this.chatLabel,
    required this.profileLabel,
    required this.homeLabel,
  });

  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final VoidCallback onBook;
  final bool showBookings, showChat, showProfile, showBook;
  final String bookingLabel, chatLabel, profileLabel, homeLabel;

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.surface,
    child: SafeArea(
      top: false,
      child: SizedBox(
        height: 52,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Row(
              children: [
                _NavIcon(
                  index: 0,
                  selectedIndex: selectedIndex,
                  icon: AppIcons.home,
                  activeIcon: AppIcons.homeFill,
                  onTap: onChanged,
                  label: homeLabel,
                ),
                if (showBookings)
                  _NavIcon(
                    index: 1,
                    selectedIndex: selectedIndex,
                    icon: AppIcons.calendar,
                    activeIcon: AppIcons.calendarFill,
                    onTap: onChanged,
                    label: bookingLabel,
                  ),
                const Spacer(),
                if (showChat)
                  _NavIcon(
                    index: 3,
                    selectedIndex: selectedIndex,
                    icon: AppIcons.chat,
                    activeIcon: AppIcons.chatFill,
                    onTap: onChanged,
                    label: chatLabel,
                  ),
                if (showProfile)
                  _NavIcon(
                    index: 4,
                    selectedIndex: selectedIndex,
                    icon: AppIcons.profile,
                    activeIcon: AppIcons.profileFill,
                    onTap: onChanged,
                    label: profileLabel,
                  ),
              ],
            ),
            if (showBook)
              Positioned(
                top: -18,
                child: InkResponse(
                  onTap: onBook,
                  radius: 33,
                  child: Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.shadowPink.withValues(alpha: 0.38),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(
                      AppIcons.plus,
                      color: Colors.white,
                      size: 25,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

class _NavIcon extends StatelessWidget {
  const _NavIcon({
    required this.index,
    required this.selectedIndex,
    required this.icon,
    required this.activeIcon,
    required this.onTap,
    required this.label,
  });
  final int index, selectedIndex;
  final IconData icon, activeIcon;
  final ValueChanged<int> onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    final selected = index == selectedIndex;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              selected ? activeIcon : icon,
              size: 21,
              color: selected ? AppColors.primaryDark : AppColors.textMuted,
            ),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                color: selected ? AppColors.primaryDark : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
