import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../modules/auth/auth_controller.dart';
import '../../data/repositories/customer_repository.dart';
import '../../data/repositories/customer_overview_repository.dart';
import '../../data/models/customer_overview.dart';
import '../../routes/app_routes.dart';
import 'customer_overview_controller.dart';
import 'profile_controller.dart';

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
    final controller = Get.isRegistered<ProfileController>()
        ? Get.find<ProfileController>()
        : Get.put(ProfileController(CustomerRepository()));
    final overview = Get.isRegistered<CustomerOverviewController>()
        ? Get.find<CustomerOverviewController>()
        : Get.put(CustomerOverviewController(CustomerOverviewRepository()));
    return Scaffold(
      appBar: AppBar(title: const Text('Cá nhân'), centerTitle: true),
      body: SafeArea(
        top: false,
        child: Obx(() {
          final c = session.customer.value;
          if (c == null) return const SizedBox.shrink();
          return RefreshIndicator(
            onRefresh: controller.refreshProfile,
            child: DefaultTabController(
              length: 3,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: [
                  if (controller.errorMessage.value != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        controller.errorMessage.value!,
                        style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  _ProfileHero(
                    name: c.fullName,
                    code: c.code,
                    tier: _tierLabels[c.tier] ?? c.tier,
                    totalSpent: c.totalSpent ?? 0,
                    loyaltyPoints: c.loyaltyPoints,
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
                      Tab(text: 'Tổng quan'),
                      Tab(text: 'Hồ sơ khám'),
                      Tab(text: 'Tài khoản'),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 540,
                    child: TabBarView(
                      children: [
                        _HealthJourney(),
                        _ClinicalRecord(overview: overview),
                        _AccountActions(onLogout: () => _logout(context)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
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
      Get.offAllNamed(AppRoutes.shell);
    }
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({
    required this.name,
    required this.code,
    required this.tier,
    required this.totalSpent,
    required this.loyaltyPoints,
  });
  final String name, code, tier;
  final double totalSpent;
  final int loyaltyPoints;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFF3B3042), Color(0xFF8A4E6A)],
      ),
      borderRadius: BorderRadius.circular(16),
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
        Row(
          children: [
            Expanded(
              child: _HeroMetric(label: 'HẠNG THÀNH VIÊN', value: tier),
            ),
            Expanded(
              child: _HeroMetric(
                label: 'ĐIỂM TÍCH LŨY',
                value: '$loyaltyPoints điểm',
              ),
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
        icon: AppIcons.chart,
        title: 'Liệu trình của tôi',
        subtitle: 'Theo dõi tiến độ và lịch chăm sóc',
        accent: AppColors.primaryDark,
      ),
      _JourneyCard(
        icon: AppIcons.healthRecord,
        title: 'Chẩn đoán & hồ sơ khám',
        subtitle: 'Chẩn đoán, hình ảnh và chỉ định',
        accent: Color(0xFF0F7A72),
      ),
      _JourneyCard(
        icon: AppIcons.calendar,
        title: 'Lịch khám & lịch chờ',
        subtitle: 'Quản lý lịch tư vấn, điều trị, tái khám',
        accent: Color(0xFFAD6A11),
      ),
      _JourneyCard(
        icon: AppIcons.invoice,
        title: 'Hóa đơn & đơn hàng',
        subtitle: 'Xem chi tiết thanh toán và dịch vụ đã dùng',
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

class _ClinicalRecord extends StatelessWidget {
  const _ClinicalRecord({required this.overview});
  final CustomerOverviewController overview;

  @override
  Widget build(BuildContext context) => Obx(() {
    if (overview.isLoading.value && overview.data.value == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final data = overview.data.value;
    if (data == null) {
      return Center(
        child: TextButton.icon(
          onPressed: overview.load,
          icon: const Icon(Icons.refresh),
          label: Text(overview.errorMessage.value ?? 'Tải lại hồ sơ khám'),
        ),
      );
    }
    return ListView(
      children: [
        _RecordHeading(
          'Liệu trình đang theo dõi',
          '${data.treatments.length} liệu trình',
        ),
        if (data.treatments.isEmpty)
          const _RecordEmpty('Chưa có liệu trình được ghi nhận'),
        ...data.treatments.map((item) => _TreatmentTile(treatment: item)),
        const SizedBox(height: 12),
        _RecordHeading(
          'Kết quả thăm khám',
          '${data.consultations.length} lượt',
        ),
        if (data.consultations.isEmpty)
          const _RecordEmpty('Chưa có kết quả thăm khám'),
        ...data.consultations
            .take(3)
            .map(
              (item) => _DetailTile(
                icon: AppIcons.healthRecord,
                title: item.diagnosis ?? item.summary ?? 'Thăm khám',
                subtitle: [
                  item.consultedAt,
                  item.nextAction,
                ].whereType<String>().join(' · '),
                accent: AppColors.info,
              ),
            ),
        const SizedBox(height: 12),
        _RecordHeading('Hồ sơ bệnh án', '${data.medicalEpisodes.length} hồ sơ'),
        if (data.medicalEpisodes.isEmpty)
          const _RecordEmpty('Chưa có hồ sơ bệnh án'),
        ...data.medicalEpisodes
            .take(3)
            .map(
              (item) => _DetailTile(
                icon: AppIcons.heartbeat,
                title: item.serviceName,
                subtitle: [
                  item.doctorName,
                  item.diagnosis,
                  item.operationDate,
                ].whereType<String>().join(' · '),
                accent: AppColors.primaryDark,
              ),
            ),
        const SizedBox(height: 12),
        _RecordHeading(
          'Dịch vụ đã sử dụng',
          '${data.serviceOrders.length} đơn',
        ),
        ...data.serviceOrders
            .take(3)
            .map(
              (item) => _DetailTile(
                icon: AppIcons.invoice,
                title: item.serviceName,
                subtitle: [
                  item.code,
                  item.orderDate,
                  item.status,
                ].whereType<String>().join(' · '),
                accent: const Color(0xFF6F62A5),
              ),
            ),
        if (data.images.isNotEmpty) ...[
          const SizedBox(height: 12),
          _RecordHeading('Hình ảnh theo dõi', '${data.images.length} ảnh'),
          SizedBox(
            height: 116,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: data.images.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (_, index) =>
                  _ClinicalImage(image: data.images[index]),
            ),
          ),
        ],
      ],
    );
  });
}

class _RecordHeading extends StatelessWidget {
  const _RecordHeading(this.title, this.count);
  final String title, count;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
          ),
        ),
        Text(
          count,
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
      ],
    ),
  );
}

class _RecordEmpty extends StatelessWidget {
  const _RecordEmpty(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      text,
      style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted),
    ),
  );
}

class _TreatmentTile extends StatelessWidget {
  const _TreatmentTile({required this.treatment});
  final Treatment treatment;
  @override
  Widget build(BuildContext context) {
    final progress = treatment.totalSessions == 0
        ? 0.0
        : treatment.completedSessions / treatment.totalSessions;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(AppIcons.chart, color: AppColors.primaryDark),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    treatment.name,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  '${treatment.completedSessions}/${treatment.totalSessions}',
                  style: const TextStyle(
                    color: AppColors.primaryDark,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: progress.clamp(0, 1),
              borderRadius: BorderRadius.circular(9),
              color: AppColors.primaryDark,
              backgroundColor: AppColors.primarySoft,
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailTile extends StatelessWidget {
  const _DetailTile({
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
    padding: const EdgeInsets.only(bottom: 8),
    child: Card(
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          backgroundColor: accent.withValues(alpha: .12),
          child: Icon(icon, color: accent, size: 19),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        ),
        subtitle: subtitle.isEmpty
            ? null
            : Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
      ),
    ),
  );
}

class _ClinicalImage extends StatelessWidget {
  const _ClinicalImage({required this.image});
  final CustomerClinicalImage image;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 122,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: image.imageUrl?.isNotEmpty == true
          ? Image.network(
              image.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _fallback(),
            )
          : _fallback(),
    ),
  );
  Widget _fallback() => Container(
    color: AppColors.primarySoft,
    alignment: Alignment.center,
    child: const Icon(AppIcons.healthRecord, color: AppColors.primaryDark),
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
              leading: Icon(AppIcons.membership),
              title: Text('Quyền lợi thành viên'),
              trailing: Icon(AppIcons.chevronRight),
            ),
            const Divider(height: 1),
            const ListTile(
              leading: Icon(AppIcons.privacy),
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
