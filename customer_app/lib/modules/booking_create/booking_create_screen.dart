import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/lookup_repository.dart';
import '../../widgets/loading_view.dart';
import 'booking_create_controller.dart';

const _typeOptions = {
  'CONSULTATION': 'Tư vấn',
  'PROCEDURE': 'Thực hiện dịch vụ',
  'FOLLOW_UP': 'Tái khám',
};

class BookingCreateScreen extends StatefulWidget {
  const BookingCreateScreen({super.key});

  @override
  State<BookingCreateScreen> createState() => _BookingCreateScreenState();
}

class _BookingCreateScreenState extends State<BookingCreateScreen> {
  final _controller = Get.put(BookingCreateController(AppointmentRepository(), LookupRepository()));
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    Get.delete<BookingCreateController>();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đặt lịch mới')),
      body: Obx(() {
        if (_controller.isLoadingLookups.value) return const LoadingView();
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            const Text('Chi nhánh', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _controller.selectedBranchId.value,
              items: _controller.branches
                  .map((b) => DropdownMenuItem(value: b.id, child: Text(b.name)))
                  .toList(),
              onChanged: (value) => _controller.selectedBranchId.value = value,
            ),
            const SizedBox(height: 18),
            const Text('Loại lịch hẹn', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _typeOptions.entries.map((entry) {
                return ChoiceChip(
                  label: Text(entry.value),
                  selected: _controller.selectedType.value == entry.key,
                  onSelected: (_) => _controller.selectedType.value = entry.key,
                );
              }).toList(),
            ),
            const SizedBox(height: 18),
            const Text('Bác sĩ (không bắt buộc)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String?>(
              initialValue: _controller.selectedDoctorId.value,
              items: [
                const DropdownMenuItem(value: null, child: Text('Không yêu cầu bác sĩ cụ thể')),
                ..._controller.doctors.map((d) => DropdownMenuItem(value: d.id, child: Text(d.fullName))),
              ],
              onChanged: (value) => _controller.selectedDoctorId.value = value,
            ),
            const SizedBox(height: 18),
            const Text('Ngày và giờ hẹn', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _pickDate,
                    child: Text(_controller.selectedDate.value != null
                        ? formatDate(_controller.selectedDate.value!)
                        : 'Chọn ngày'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _pickTime,
                    child: Text(_controller.selectedTime.value != null
                        ? _formatDuration(_controller.selectedTime.value!)
                        : 'Chọn giờ'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text('Ghi chú (không bắt buộc)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
            const SizedBox(height: 8),
            TextField(
              controller: _noteController,
              maxLines: 3,
              onChanged: (value) => _controller.note.value = value,
              decoration: const InputDecoration(hintText: 'Mô tả triệu chứng hoặc yêu cầu của bạn'),
            ),
            const SizedBox(height: 16),
            if (_controller.errorMessage.value != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_controller.errorMessage.value!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
              ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _controller.isSubmitting.value ? null : _submit,
                child: _controller.isSubmitting.value
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Xác nhận đặt lịch'),
              ),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _controller.selectedDate.value ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 180)),
    );
    if (picked != null) _controller.selectedDate.value = picked;
  }

  Future<void> _pickTime() async {
    final current = _controller.selectedTime.value;
    final picked = await showTimePicker(
      context: context,
      initialTime: current != null
          ? TimeOfDay(hour: current.inHours, minute: current.inMinutes % 60)
          : const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) _controller.selectedTime.value = Duration(hours: picked.hour, minutes: picked.minute);
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    return '$hours:$minutes';
  }

  Future<void> _submit() async {
    final success = await _controller.submit();
    if (success && mounted) {
      Get.back();
      Get.snackbar('Thành công', 'Yêu cầu đặt lịch đã được gửi');
    }
  }
}
