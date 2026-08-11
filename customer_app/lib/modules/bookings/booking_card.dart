import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/appointment.dart';
import '../../widgets/status_badge.dart';

const _appointmentTypeLabels = {
  'CONSULTATION': 'Tư vấn',
  'PROCEDURE': 'Thực hiện dịch vụ',
  'FOLLOW_UP': 'Tái khám',
};

class BookingCard extends StatelessWidget {
  const BookingCard({super.key, required this.appointment, required this.onTap});

  final Appointment appointment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final start = appointment.startTime;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(12)),
                child: const Icon(AppIcons.calendar, color: AppColors.primaryDark, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _appointmentTypeLabels[appointment.type] ?? appointment.type,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      start != null ? formatDateTime(start) : 'Chưa xác định thời gian',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                  ],
                ),
              ),
              StatusBadge(info: appointmentStatusInfo(appointment.status)),
            ],
          ),
        ),
      ),
    );
  }
}
