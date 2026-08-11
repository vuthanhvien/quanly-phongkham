import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../modules/auth/auth_controller.dart';
import '../../routes/app_routes.dart';

const _tierLabels = {'MEMBER': 'Thành viên', 'VIP': 'Khách VIP', 'GOLD': 'Khách hàng vàng'};

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = Get.find<SessionController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ của tôi')),
      body: Obx(() {
        final customer = session.customer.value;
        if (customer == null) return const SizedBox.shrink();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(color: AppColors.primarySoft, shape: BoxShape.circle),
                      child: const Icon(AppIcons.profile, color: AppColors.primaryDark, size: 32),
                    ),
                    const SizedBox(height: 12),
                    Text(customer.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 4),
                    Text(customer.code, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                    const SizedBox(height: 10),
                    Chip(label: Text(_tierLabels[customer.tier] ?? customer.tier)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Column(
                children: [
                  _InfoTile(icon: AppIcons.phone, label: 'Số điện thoại', value: customer.phone),
                  const Divider(height: 1),
                  _InfoTile(icon: AppIcons.edit, label: 'Email', value: customer.email ?? 'Chưa cập nhật'),
                  const Divider(height: 1),
                  _InfoTile(icon: AppIcons.mapPin, label: 'Địa chỉ', value: customer.addressLine ?? customer.address ?? 'Chưa cập nhật'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => Get.toNamed(AppRoutes.profileEdit),
              icon: const Icon(AppIcons.edit, size: 18),
              label: const Text('Chỉnh sửa thông tin'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => _logout(context),
              icon: const Icon(AppIcons.logout, size: 18, color: AppColors.error),
              label: const Text('Đăng xuất', style: TextStyle(color: AppColors.error)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.error)),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _logout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất không?'),
        actions: [
          TextButton(onPressed: () => Get.back(result: false), child: const Text('Không')),
          TextButton(onPressed: () => Get.back(result: true), child: const Text('Đăng xuất')),
        ],
      ),
    );
    if (confirmed == true) {
      await Get.find<SessionController>().logout();
      if (Get.isRegistered<AuthController>()) Get.delete<AuthController>();
      Get.offAllNamed(AppRoutes.phoneEntry);
    }
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textMuted, size: 20),
      title: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
      subtitle: Text(value, style: const TextStyle(fontSize: 14.5)),
    );
  }
}
