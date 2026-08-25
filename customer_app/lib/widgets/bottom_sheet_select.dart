import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';

class BottomSheetOption<T> {
  const BottomSheetOption({
    required this.value,
    required this.label,
    this.subtitle,
  });

  final T value;
  final String label;
  final String? subtitle;
}

class BottomSheetSelect<T> extends StatelessWidget {
  const BottomSheetSelect({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.hintText = 'Chọn một mục',
    this.enabled = true,
  });

  final T? value;
  final List<BottomSheetOption<T>> options;
  final ValueChanged<T> onChanged;
  final String hintText;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final matches = options.where((item) => item.value == value);
    final selected = matches.isEmpty ? null : matches.first;
    return InkWell(
      onTap: !enabled
          ? null
          : () async {
              final next = await showBottomSheetSelect<T>(
                context: context,
                title: hintText,
                value: value,
                options: options,
              );
              if (next != null) onChanged(next);
            },
      borderRadius: BorderRadius.circular(10),
      child: InputDecorator(
        decoration: InputDecoration(
          hintText: hintText,
          suffixIcon: const Icon(Icons.keyboard_arrow_down_rounded),
          enabled: enabled,
        ),
        child: Text(
          selected?.label ?? hintText,
          style: TextStyle(
            color: selected == null ? AppColors.textMuted : AppColors.text,
          ),
        ),
      ),
    );
  }
}

Future<T?> showBottomSheetSelect<T>({
  required BuildContext context,
  required String title,
  required T? value,
  required List<BottomSheetOption<T>> options,
}) => showModalBottomSheet<T>(
  context: context,
  showDragHandle: true,
  isScrollControlled: true,
  backgroundColor: AppColors.surface,
  builder: (context) => SafeArea(
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .72,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 12),
            child: Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
              itemCount: options.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (_, index) {
                final item = options[index];
                final selected = item.value == value;
                return ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  tileColor: selected ? AppColors.accentSoft : null,
                  title: Text(
                    item.label,
                    style: TextStyle(
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: selected ? AppColors.accent : AppColors.text,
                    ),
                  ),
                  subtitle: item.subtitle == null ? null : Text(item.subtitle!),
                  trailing: selected
                      ? const Icon(Icons.check_circle, color: AppColors.accent)
                      : null,
                  onTap: () => Navigator.of(context).pop(item.value),
                );
              },
            ),
          ),
        ],
      ),
    ),
  ),
);
