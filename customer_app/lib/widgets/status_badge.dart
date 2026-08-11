import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';

class StatusInfo {
  const StatusInfo(this.label, this.color, this.background);
  final String label;
  final Color color;
  final Color background;
}

StatusInfo appointmentStatusInfo(String status) {
  switch (status) {
    case 'CONFIRMED':
      return const StatusInfo('Đã xác nhận', AppColors.info, Color(0x220F7A72));
    case 'COMPLETED':
      return const StatusInfo('Hoàn tất', AppColors.success, AppColors.successBg);
    case 'CANCELLED':
      return const StatusInfo('Đã hủy', AppColors.error, AppColors.errorBg);
    case 'SCHEDULED':
    default:
      return const StatusInfo('Đã đặt lịch', AppColors.warning, AppColors.warningBg);
  }
}

StatusInfo invoiceStatusInfo(String status) {
  switch (status) {
    case 'PAID':
      return const StatusInfo('Đã thanh toán', AppColors.success, AppColors.successBg);
    case 'PARTIAL':
      return const StatusInfo('Thanh toán một phần', AppColors.warning, AppColors.warningBg);
    case 'UNPAID':
    default:
      return const StatusInfo('Chưa thanh toán', AppColors.error, AppColors.errorBg);
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.info});
  final StatusInfo info;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: info.background, borderRadius: BorderRadius.circular(999)),
      child: Text(
        info.label,
        style: TextStyle(color: info.color, fontWeight: FontWeight.w600, fontSize: 12.5),
      ),
    );
  }
}
