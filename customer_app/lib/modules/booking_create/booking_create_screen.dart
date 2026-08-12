import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../core/utils/formatters.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/repositories/lookup_repository.dart';
import '../../widgets/loading_view.dart';
import 'booking_create_controller.dart';

const _typeOptions = {
  'CONSULTATION': ('Tư vấn', 'Khám và tư vấn cùng bác sĩ'),
  'PROCEDURE': ('Thực hiện dịch vụ', 'Tiếp tục dịch vụ/điều trị'),
  'FOLLOW_UP': ('Tái khám', 'Theo dõi kết quả điều trị'),
};

class BookingCreateScreen extends StatefulWidget {
  const BookingCreateScreen({super.key});
  @override
  State<BookingCreateScreen> createState() => _BookingCreateScreenState();
}

class _BookingCreateScreenState extends State<BookingCreateScreen> {
  final _controller = Get.put(
    BookingCreateController(AppointmentRepository(), LookupRepository()),
  );
  final _noteController = TextEditingController();
  int _step = 0;
  @override
  void dispose() {
    _noteController.dispose();
    Get.delete<BookingCreateController>();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Đặt lịch hẹn'),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(55),
        child: _StepHeader(step: _step),
      ),
    ),
    body: Obx(() {
      if (_controller.isLoadingLookups.value) return const LoadingView();
      return SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 16),
                children: [_stepBody()],
              ),
            ),
            if (_controller.errorMessage.value != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Text(
                  _controller.errorMessage.value!,
                  style: const TextStyle(color: AppColors.error, fontSize: 13),
                ),
              ),
            _BottomActions(
              step: _step,
              submitting: _controller.isSubmitting.value,
              onBack: _back,
              onNext: _next,
              onSubmit: _submit,
            ),
          ],
        ),
      );
    }),
  );
  Widget _stepBody() {
    switch (_step) {
      case 0:
        return _ServiceBranchStep(controller: _controller);
      case 1:
        return _DoctorStep(controller: _controller);
      case 2:
        return _DateTimeStep(
          controller: _controller,
          pickDate: _pickDate,
          pickTime: _pickTime,
        );
      default:
        return _ConfirmStep(
          controller: _controller,
          noteController: _noteController,
        );
    }
  }

  void _back() => setState(() => _step = _step - 1);
  void _next() {
    if (_step == 0 && _controller.selectedBranchId.value == null) {
      _controller.errorMessage.value = 'Vui lòng chọn chi nhánh';
      return;
    }
    setState(() {
      _controller.errorMessage.value = null;
      _step++;
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final v = await showDatePicker(
      context: context,
      initialDate: _controller.selectedDate.value ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 180)),
    );
    if (v != null) _controller.selectedDate.value = v;
  }

  Future<void> _pickTime() async {
    final old = _controller.selectedTime.value;
    final v = await showTimePicker(
      context: context,
      initialTime: old == null
          ? const TimeOfDay(hour: 9, minute: 0)
          : TimeOfDay(hour: old.inHours, minute: old.inMinutes % 60),
    );
    if (v != null) {
      _controller.selectedTime.value = Duration(
        hours: v.hour,
        minutes: v.minute,
      );
    }
  }

  Future<void> _submit() async {
    final success = await _controller.submit();
    if (success && mounted) {
      Get.back();
      Get.snackbar(
        'Đặt lịch thành công',
        'Yêu cầu của bạn đã được gửi đến phòng khám',
      );
    }
  }
}

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step});
  final int step;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
    child: Row(
      children: List.generate(
        4,
        (i) => Expanded(
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: i <= step ? AppColors.primary : AppColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              if (i != 3) const SizedBox(width: 5),
            ],
          ),
        ),
      ),
    ),
  );
}

class _StepTitle extends StatelessWidget {
  const _StepTitle(this.title, this.subtitle);
  final String title, subtitle;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 22),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 23),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: const TextStyle(color: AppColors.textMuted, height: 1.4),
        ),
      ],
    ),
  );
}

class _ServiceBranchStep extends StatelessWidget {
  const _ServiceBranchStep({required this.controller});
  final BookingCreateController controller;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _StepTitle(
        'Bạn cần hỗ trợ gì?',
        'Chọn loại lịch hẹn và cơ sở thuận tiện nhất.',
      ),
      const Text(
        'Loại lịch hẹn',
        style: TextStyle(fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 10),
      ..._typeOptions.entries.map(
        (e) => Padding(
          padding: const EdgeInsets.only(bottom: 9),
          child: _SelectTile(
            title: e.value.$1,
            subtitle: e.value.$2,
            selected: controller.selectedType.value == e.key,
            onTap: () => controller.selectedType.value = e.key,
          ),
        ),
      ),
      const SizedBox(height: 16),
      const Text('Chi nhánh', style: TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 9),
      DropdownButtonFormField<String>(
        initialValue: controller.selectedBranchId.value,
        items: controller.branches
            .map((b) => DropdownMenuItem(value: b.id, child: Text(b.name)))
            .toList(),
        onChanged: (v) => controller.selectedBranchId.value = v,
      ),
    ],
  );
}

class _DoctorStep extends StatelessWidget {
  const _DoctorStep({required this.controller});
  final BookingCreateController controller;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _StepTitle(
        'Chọn bác sĩ',
        'Bạn có thể để phòng khám sắp xếp bác sĩ phù hợp.',
      ),
      _SelectTile(
        title: 'Không yêu cầu bác sĩ',
        subtitle: 'Phòng khám sẽ tư vấn người phù hợp',
        selected: controller.selectedDoctorId.value == null,
        onTap: () => controller.selectedDoctorId.value = null,
      ),
      const SizedBox(height: 10),
      ...controller.doctors.map(
        (d) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _SelectTile(
            title: d.fullName,
            subtitle: d.position ?? 'Bác sĩ chuyên môn',
            selected: controller.selectedDoctorId.value == d.id,
            onTap: () => controller.selectedDoctorId.value = d.id,
            avatar: true,
          ),
        ),
      ),
    ],
  );
}

class _DateTimeStep extends StatelessWidget {
  const _DateTimeStep({
    required this.controller,
    required this.pickDate,
    required this.pickTime,
  });
  final BookingCreateController controller;
  final VoidCallback pickDate, pickTime;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _StepTitle(
        'Chọn thời gian',
        'Chọn ngày giờ bạn mong muốn. Phòng khám sẽ xác nhận lại.',
      ),
      const Text('Ngày hẹn', style: TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 9),
      OutlinedButton.icon(
        onPressed: pickDate,
        icon: const Icon(AppIcons.calendarPicker),
        label: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            controller.selectedDate.value == null
                ? 'Chọn ngày hẹn'
                : formatDate(controller.selectedDate.value!),
          ),
        ),
      ),
      const SizedBox(height: 18),
      const Text('Giờ hẹn', style: TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 9),
      OutlinedButton.icon(
        onPressed: pickTime,
        icon: const Icon(AppIcons.timePicker),
        label: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            controller.selectedTime.value == null
                ? 'Chọn giờ hẹn'
                : '${controller.selectedTime.value!.inHours.toString().padLeft(2, '0')}:${(controller.selectedTime.value!.inMinutes % 60).toString().padLeft(2, '0')}',
          ),
        ),
      ),
      const SizedBox(height: 22),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.primarySoft,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Row(
          children: [
            Icon(AppIcons.info, color: AppColors.primaryDark),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Khung giờ hiển thị là yêu cầu mong muốn. Chúng tôi sẽ liên hệ xác nhận lịch chính thức.',
                style: TextStyle(fontSize: 12.5, height: 1.4),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

class _ConfirmStep extends StatelessWidget {
  const _ConfirmStep({required this.controller, required this.noteController});
  final BookingCreateController controller;
  final TextEditingController noteController;

  @override
  Widget build(BuildContext context) {
    final branch = controller.branches.firstWhere(
      (e) => e.id == controller.selectedBranchId.value,
    );
    final doctor = controller.selectedDoctorId.value == null
        ? 'Phòng khám sắp xếp'
        : controller.doctors
              .firstWhere((e) => e.id == controller.selectedDoctorId.value)
              .fullName;
    final time = controller.selectedTime.value!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _StepTitle(
          'Xác nhận lịch hẹn',
          'Kiểm tra lại thông tin trước khi gửi yêu cầu.',
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _row(
                  'Dịch vụ',
                  _typeOptions[controller.selectedType.value]!.$1,
                ),
                _row('Chi nhánh', branch.name),
                _row('Bác sĩ', doctor),
                _row(
                  'Thời gian',
                  '${formatDate(controller.selectedDate.value!)} · ${time.inHours.toString().padLeft(2, '0')}:${(time.inMinutes % 60).toString().padLeft(2, '0')}',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Ghi chú cho phòng khám',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 9),
        TextField(
          controller: noteController,
          maxLines: 4,
          onChanged: (v) => controller.note.value = v,
          decoration: const InputDecoration(
            hintText: 'Mô tả triệu chứng hoặc yêu cầu của bạn (không bắt buộc)',
          ),
        ),
      ],
    );
  }

  Widget _row(String a, String b) => Padding(
    padding: const EdgeInsets.only(bottom: 13),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(a, style: const TextStyle(color: AppColors.textMuted)),
        ),
        Expanded(
          child: Text(
            b,
            textAlign: TextAlign.right,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ),
  );
}

class _SelectTile extends StatelessWidget {
  const _SelectTile({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
    this.avatar = false,
  });
  final String title, subtitle;
  final bool selected, avatar;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(14),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: selected ? AppColors.primarySoft : AppColors.surface,
        border: Border.all(
          color: selected ? AppColors.primary : AppColors.border,
          width: selected ? 1.5 : 1,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          if (avatar) ...[
            const CircleAvatar(
              radius: 19,
              backgroundColor: AppColors.primarySofter,
              child: Icon(AppIcons.person, color: AppColors.primaryDark),
            ),
            const SizedBox(width: 11),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            selected ? AppIcons.check : AppIcons.radio,
            color: selected ? AppColors.primaryDark : AppColors.border,
          ),
        ],
      ),
    ),
  );
}

class _BottomActions extends StatelessWidget {
  const _BottomActions({
    required this.step,
    required this.submitting,
    required this.onBack,
    required this.onNext,
    required this.onSubmit,
  });
  final int step;
  final bool submitting;
  final VoidCallback onBack, onNext, onSubmit;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
    decoration: BoxDecoration(
      color: AppColors.surface,
      boxShadow: [
        BoxShadow(
          color: AppColors.shadowPink.withValues(alpha: 0.16),
          blurRadius: 14,
          offset: const Offset(0, -4),
        ),
      ],
    ),
    child: Row(
      children: [
        if (step > 0) ...[
          OutlinedButton(
            onPressed: submitting ? null : onBack,
            child: const Text('Quay lại'),
          ),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: ElevatedButton(
            onPressed: submitting ? null : (step == 3 ? onSubmit : onNext),
            child: submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : Text(step == 3 ? 'Gửi yêu cầu đặt lịch' : 'Tiếp tục'),
          ),
        ),
      ],
    ),
  );
}
