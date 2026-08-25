import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/session/session_controller.dart';
import '../../widgets/login_required_view.dart';
import '../../core/config/customer_app_config_controller.dart';
import '../bookings/bookings_screen.dart';
import '../chat/chat_screen.dart';
import '../feed/feed_screen.dart';
import '../home/home_screen.dart';
import '../profile/profile_screen.dart';
import 'shell_controller.dart';

class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ShellController>();
    final config = Get.find<CustomerAppConfigController>();
    final session = Get.find<SessionController>();
    return Obx(() {
      final index = controller.tabIndex.value;
      return Scaffold(
        body: _pageFor(index, session.isLoggedIn),
        bottomNavigationBar: _ClinicBottomBar(
          selectedIndex: index,
          onChanged: controller.changeTab,
          showBookings:
              config.featureEnabled('appointments') &&
              config.menuEnabled('bookings'),
          showChat: config.featureEnabled('chat') && config.menuEnabled('chat'),
          showProfile:
              config.featureEnabled('profile') && config.menuEnabled('profile'),
          bookingLabel: config.menuLabel('bookings', 'Lịch hẹn'),
          feedLabel: config.menuLabel('feed', 'Feed'),
          chatLabel: config.menuLabel('chat', 'Tin nhắn'),
          profileLabel: config.menuLabel('profile', 'Cá nhân'),
          homeLabel: config.menuLabel('home', 'Trang chủ'),
        ),
      );
    });
  }

  Widget _pageFor(int index, bool isLoggedIn) {
    if (index == 0) return const HomeScreen();
    if (!isLoggedIn) {
      return switch (index) {
        1 => const LoginRequiredView(descriptionKey: 'login_required_bookings'),
        2 => const FeedScreen(),
        3 => const LoginRequiredView(descriptionKey: 'login_required_chat'),
        4 => const LoginRequiredView(descriptionKey: 'login_required_profile'),
        _ => const LoginRequiredView(descriptionKey: 'login_required_bookings'),
      };
    }
    return switch (index) {
      1 => const BookingsScreen(),
      2 => const FeedScreen(),
      3 => const ChatScreen(),
      4 => const ProfileScreen(),
      _ => const HomeScreen(),
    };
  }
}

class _ClinicBottomBar extends StatelessWidget {
  const _ClinicBottomBar({
    required this.selectedIndex,
    required this.onChanged,
    required this.showBookings,
    required this.showChat,
    required this.showProfile,
    required this.bookingLabel,
    required this.feedLabel,
    required this.chatLabel,
    required this.profileLabel,
    required this.homeLabel,
  });

  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final bool showBookings, showChat, showProfile;
  final String bookingLabel, feedLabel, chatLabel, profileLabel, homeLabel;

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.surface,
    child: SafeArea(
      top: false,
      child: SizedBox(
        height: 56,
        child: Row(
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
            _NavAction(
              icon: AppIcons.note,
              selected: selectedIndex == 2,
              onTap: () => onChanged(2),
              label: feedLabel,
            ),
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
      ),
    ),
  );
}

class _NavAction extends StatelessWidget {
  const _NavAction({
    required this.icon,
    required this.selected,
    required this.onTap,
    required this.label,
  });

  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 21,
            color: selected ? AppColors.accent : AppColors.textMuted,
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              color: selected ? AppColors.accent : AppColors.textMuted,
            ),
          ),
        ],
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
              color: selected ? AppColors.accent : AppColors.textMuted,
            ),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                color: selected ? AppColors.accent : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
