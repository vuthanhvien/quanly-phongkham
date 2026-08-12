import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../modules/auth/auth_controller.dart';
import '../../routes/app_routes.dart';

const _tierLabels = {
  'MEMBER': 'Thành viên',
  'VIP': 'Khách hàng VIP',
  'GOLD': 'Khách hàng vàng',
};

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final session = Get.find<SessionController>();
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ sức khỏe')),
      body: Obx(() {
        final c = session.customer.value;
        if (c == null) return const SizedBox.shrink();
        return DefaultTabController(
          length: 2,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              _ProfileHero(
                name: c.fullName,
                code: c.code,
                tier: _tierLabels[c.tier] ?? c.tier,
                totalSpent: c.totalSpent ?? 0,
              ),
              const SizedBox(height: 16),
              Card(
                child: Column(
                  children: [
                    _InfoTile(
                      icon: AppIcons.phone,
                      label: 'Số điện thoại',
                      value: c.phone,
                    ),
                    const Divider(height: 1),
                    _InfoTile(
                      icon: AppIcons.edit,
                      label: 'Email',
                      value: c.email ?? 'Chưa cập nhật',
                    ),
                    const Divider(height: 1),
                    _InfoTile(
                      icon: AppIcons.mapPin,
                      label: 'Địa chỉ',
                      value: c.addressLine ?? c.address ?? 'Chưa cập nhật',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const TabBar(
                tabs: [
                  Tab(text: 'Hành trình sức khỏe'),
                  Tab(text: 'Tài khoản'),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 496,
                child: TabBarView(
                  children: [
                    _HealthJourney(),
                    _AccountActions(onLogout: () => _logout(context)),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Future<void> _logout(BuildContext context) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất không?'),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Get.back(result: true),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (yes == true) {
      await Get.find<SessionController>().logout();
      if (Get.isRegistered<AuthController>()) Get.delete<AuthController>();
      Get.offAllNamed(AppRoutes.phoneEntry);
    }
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({
    required this.name,
    required this.code,
    required this.tier,
    required this.totalSpent,
  });
  final String name, code, tier;
  final double totalSpent;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFF3B3042), Color(0xFF8A4E6A)],
      ),
      borderRadius: BorderRadius.circular(22),
    ),
    child: Column(
      children: [
        Row(
          children: [
            const CircleAvatar(
              radius: 31,
              backgroundColor: Color(0xFFFFD7E5),
              child: Icon(
                AppIcons.profile,
                color: AppColors.primaryDark,
                size: 34,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    code,
                    style: const TextStyle(
                      color: Color(0xFFE8DCE2),
                      fontSize: 12.5,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0x22FFFFFF),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                tier,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 11.5,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const Divider(color: Color(0x33FFFFFF)),
        const SizedBox(height: 11),
        const Row(
          children: [
            Expanded(
              child: _HeroMetric(label: 'HẠNG THÀNH VIÊN', value: 'Silver'),
            ),
            Expanded(
              child: _HeroMetric(label: 'ĐIỂM TÍCH LŨY', value: '1,240 điểm'),
            ),
          ],
        ),
      ],
    ),
  );
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.label, required this.value});
  final String label, value;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(
          color: Color(0xFFDBC8D1),
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          letterSpacing: .4,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        value,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w800,
        ),
      ),
    ],
  );
}

class _HealthJourney extends StatelessWidget {
  @override
  Widget build(BuildContext context) => ListView(
    children: const [
      _JourneyCard(
        icon: Icons.auto_graph_rounded,
        title: 'Liệu trình của tôi',
        subtitle: 'Chăm sóc da phục hồi · 2/6 buổi',
        accent: AppColors.primaryDark,
      ),
      _JourneyCard(
        icon: Icons.health_and_safety_outlined,
        title: 'Chẩn đoán & hồ sơ khám',
        subtitle: 'Kết quả khám gần nhất: 05/08/2026',
        accent: Color(0xFF0F7A72),
      ),
      _JourneyCard(
        icon: AppIcons.calendar,
        title: 'Lịch khám & lịch chờ',
        subtitle: '1 lịch sắp tới · 0 lịch chờ',
        accent: Color(0xFFAD6A11),
      ),
      _JourneyCard(
        icon: AppIcons.invoice,
        title: 'Hóa đơn & đơn hàng',
        subtitle: 'Xem chi tiết thanh toán và dịch vụ',
        accent: Color(0xFF6F62A5),
      ),
    ],
  );
}

class _JourneyCard extends StatelessWidget {
  const _JourneyCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accent,
  });
  final IconData icon;
  final String title, subtitle;
  final Color accent;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 11),
    child: Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: accent.withValues(alpha: .12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: accent),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 3),
          child: Text(subtitle),
        ),
        trailing: const Icon(AppIcons.chevronRight, color: AppColors.textMuted),
      ),
    ),
  );
}

class _AccountActions extends StatelessWidget {
  const _AccountActions({required this.onLogout});
  final VoidCallback onLogout;
  @override
  Widget build(BuildContext context) => ListView(
    children: [
      Card(
        child: Column(
          children: [
            ListTile(
              leading: const Icon(AppIcons.edit),
              title: const Text('Chỉnh sửa thông tin'),
              trailing: const Icon(AppIcons.chevronRight),
              onTap: () => Get.toNamed(AppRoutes.profileEdit),
            ),
            const Divider(height: 1),
            const ListTile(
              leading: Icon(Icons.workspace_premium_outlined),
              title: Text('Quyền lợi thành viên'),
              trailing: Icon(AppIcons.chevronRight),
            ),
            const Divider(height: 1),
            const ListTile(
              leading: Icon(Icons.privacy_tip_outlined),
              title: Text('Quyền riêng tư & bảo mật'),
              trailing: Icon(AppIcons.chevronRight),
            ),
          ],
        ),
      ),
      const SizedBox(height: 18),
      OutlinedButton.icon(
        onPressed: onLogout,
        icon: const Icon(AppIcons.logout, color: AppColors.error),
        label: const Text(
          'Đăng xuất',
          style: TextStyle(color: AppColors.error),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.error),
        ),
      ),
    ],
  );
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label, value;
  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon, color: AppColors.textMuted, size: 20),
    title: Text(
      label,
      style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
    ),
    subtitle: Text(value, style: const TextStyle(fontSize: 14.5)),
  );
}
