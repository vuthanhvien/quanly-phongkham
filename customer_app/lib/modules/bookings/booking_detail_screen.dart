import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../core/utils/formatters.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/status_badge.dart';
import 'booking_detail_controller.dart';

class BookingDetailScreen extends StatelessWidget {
  const BookingDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final id = Get.arguments as String;
    final controller = Get.put(
      BookingDetailController(AppointmentRepository(), id),
      tag: id,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết lịch hẹn')),
      body: Obx(() {
        if (controller.isLoading.value) return const LoadingView();
        final appointment = controller.appointment.value;
        if (appointment == null) {
          return EmptyState(
            icon: AppIcons.empty,
            message: controller.errorMessage.value ?? 'Không tìm thấy lịch hẹn',
            actionLabel: 'Thử lại',
            onAction: controller.load,
          );
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _typeLabel(appointment.type),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 17,
                          ),
                        ),
                        StatusBadge(
                          info: appointmentStatusInfo(appointment.status),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(
                      icon: AppIcons.clock,
                      label: 'Thời gian',
                      value: appointment.startTime != null
                          ? formatDateTime(appointment.startTime!)
                          : 'Chưa xác định',
                    ),
                    if (appointment.note != null &&
                        appointment.note!.isNotEmpty)
                      _InfoRow(
                        icon: AppIcons.note,
                        label: 'Ghi chú',
                        value: appointment.note!,
                      ),
                  ],
                ),
              ),
            ),
            if (appointment.isCancellable) ...[
              const SizedBox(height: 20),
              Obx(
                () => SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: controller.isCancelling.value
                        ? null
                        : () => _confirmCancel(context, controller),
                    icon: const Icon(
                      AppIcons.cancel,
                      color: AppColors.error,
                      size: 18,
                    ),
                    label: const Text(
                      'Hủy lịch hẹn',
                      style: TextStyle(color: AppColors.error),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.error),
                    ),
                  ),
                ),
              ),
            ],
          ],
        );
      }),
    );
  }

  Future<void> _confirmCancel(
    BuildContext context,
    BookingDetailController controller,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hủy lịch hẹn'),
        content: const Text('Bạn có chắc chắn muốn hủy lịch hẹn này không?'),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Get.back(result: true),
            child: const Text('Hủy lịch hẹn'),
          ),
        ],
      ),
    );
    if (confirmed == true) await controller.cancel();
  }

  String _typeLabel(String type) =>
      const {
        'CONSULTATION': 'Tư vấn',
        'PROCEDURE': 'Thực hiện dịch vụ',
        'FOLLOW_UP': 'Tái khám',
      }[type] ??
      type;
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 14.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
