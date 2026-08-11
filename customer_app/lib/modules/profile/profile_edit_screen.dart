import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/session/session_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/error_utils.dart';
import '../../data/models/customer.dart';
import '../../data/repositories/customer_repository.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _repository = CustomerRepository();
  late final _emailController = TextEditingController(text: _customer?.email);
  late final _addressController = TextEditingController(text: _customer?.addressLine ?? _customer?.address);
  String? _gender;
  bool _isSubmitting = false;
  String? _error;

  Customer? get _customer => Get.find<SessionController>().customer.value;

  @override
  void initState() {
    super.initState();
    _gender = _customer?.gender;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chỉnh sửa thông tin')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Email', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
          const SizedBox(height: 8),
          TextField(controller: _emailController, keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 18),
          const Text('Giới tính', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _gender,
            items: const [
              DropdownMenuItem(value: 'male', child: Text('Nam')),
              DropdownMenuItem(value: 'female', child: Text('Nữ')),
              DropdownMenuItem(value: 'other', child: Text('Khác')),
            ],
            onChanged: (value) => setState(() => _gender = value),
          ),
          const SizedBox(height: 18),
          const Text('Địa chỉ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
          const SizedBox(height: 8),
          TextField(controller: _addressController, maxLines: 2),
          const SizedBox(height: 20),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
            ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Lưu thay đổi'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final updated = await _repository.updateMe({
        'email': _emailController.text.trim(),
        'gender': _gender,
        'addressLine': _addressController.text.trim(),
      });
      Get.find<SessionController>().updateProfile(updated);
      if (mounted) Get.back();
    } catch (e) {
      setState(() => _error = describeError(e));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
