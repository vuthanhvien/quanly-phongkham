import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../core/api/env.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';
import '../../routes/app_routes.dart';
import 'auth_controller.dart';

enum _LoginMethod { phone, email }

class PhoneEntryScreen extends StatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  State<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends State<PhoneEntryScreen> {
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _controller = Get.find<AuthController>();
  var _method = _LoginMethod.phone;
  var _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Each visit starts a fresh authentication attempt rather than preserving
    // an earlier OTP, validation error, or partially completed step.
    _controller.reset();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _selectMethod(_LoginMethod value) {
    setState(() => _method = value);
    _controller.reset();
  }

  void _backToHome() {
    if (Navigator.of(context).canPop()) {
      Get.back();
    } else {
      Get.offAllNamed(AppRoutes.shell);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPhone = _method == _LoginMethod.phone;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              IconButton(
                onPressed: _backToHome,
                tooltip: 'Quay lại trang chủ',
                icon: const Icon(AppIcons.chevronLeft),
              ),
              const Spacer(),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  AppIcons.heartbeat,
                  color: AppColors.primaryDark,
                  size: 28,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Đăng nhập',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                isPhone
                    ? 'Nhập số điện thoại đã đăng ký để nhận mã xác thực'
                    : 'Đăng nhập bằng email và mật khẩu của bạn',
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 10),
              const _TenantLabel(),
              const SizedBox(height: 24),
              _AuthMethodTabs(
                selectedIndex: isPhone ? 0 : 1,
                onChanged: (index) => _selectMethod(
                  index == 0 ? _LoginMethod.phone : _LoginMethod.email,
                ),
              ),
              const SizedBox(height: 20),
              if (isPhone)
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(11),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Số điện thoại',
                    prefixIcon: Padding(
                      padding: EdgeInsets.all(14),
                      child: Icon(AppIcons.phone, size: 20),
                    ),
                    hintText: '09xxxxxxxx',
                  ),
                )
              else ...[
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                    hintText: 'you@example.com',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  onSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      tooltip: _obscurePassword
                          ? 'Hiện mật khẩu'
                          : 'Ẩn mật khẩu',
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Obx(() {
                final error = _controller.errorMessage.value;
                if (error == null) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    error,
                    style: const TextStyle(
                      color: AppColors.error,
                      fontSize: 13,
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              Obx(
                () => SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _controller.isSubmitting.value ? null : _submit,
                    child: _controller.isSubmitting.value
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(isPhone ? 'Gửi mã xác thực' : 'Đăng nhập'),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: () => Get.toNamed(AppRoutes.register),
                  child: const Text('Chưa có tài khoản? Đăng ký'),
                ),
              ),
              const Spacer(flex: 2),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(AppIcons.shield, size: 16, color: AppColors.textMuted),
                  SizedBox(width: 6),
                  Text(
                    'Thông tin của bạn được bảo mật',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _submit() {
    if (_method == _LoginMethod.phone) {
      _controller.requestOtp(_phoneController.text);
    } else {
      _controller.loginWithEmail(
        _emailController.text,
        _passwordController.text,
      );
    }
  }
}

class _TenantLabel extends StatelessWidget {
  const _TenantLabel();

  @override
  Widget build(BuildContext context) => Row(
    children: [
      const Icon(Icons.language_outlined, size: 16, color: AppColors.textMuted),
      const SizedBox(width: 6),
      Expanded(
        child: Text(
          'Phòng khám: ${Env.tenantDomain}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
        ),
      ),
    ],
  );
}

class _AuthMethodTabs extends StatelessWidget {
  const _AuthMethodTabs({required this.selectedIndex, required this.onChanged});

  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => DefaultTabController(
    key: ValueKey(selectedIndex),
    length: 2,
    initialIndex: selectedIndex,
    child: TabBar(
      onTap: onChanged,
      dividerColor: AppColors.border,
      indicatorColor: AppColors.accent,
      indicatorWeight: 3,
      labelColor: AppColors.accent,
      unselectedLabelColor: AppColors.textMuted,
      labelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      tabs: const [
        Tab(text: 'Số điện thoại'),
        Tab(text: 'Email'),
      ],
    ),
  );
}
