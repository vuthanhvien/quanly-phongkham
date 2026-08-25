import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../routes/app_routes.dart';
import 'auth_controller.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _controller = Get.find<AuthController>();
  var _byPhone = true;
  var _obscure = true;

  @override
  void initState() {
    super.initState();
    _controller.reset();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: IconButton(
        onPressed: () => Get.offNamed(AppRoutes.phoneEntry),
        icon: const Icon(Icons.arrow_back),
        tooltip: 'Quay lại đăng nhập',
      ),
    ),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
        children: [
          Text(
            'Tạo tài khoản',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          const Text(
            'Chọn một cách đăng ký. Nếu tài khoản đã tồn tại, hãy đăng nhập theo đúng phương thức đã dùng.',
            style: TextStyle(color: AppColors.textMuted, height: 1.4),
          ),
          const SizedBox(height: 24),
          DefaultTabController(
            key: ValueKey(_byPhone),
            length: 2,
            initialIndex: _byPhone ? 0 : 1,
            child: TabBar(
              onTap: (index) => _select(index == 0),
              dividerColor: AppColors.border,
              indicatorColor: AppColors.accent,
              indicatorWeight: 3,
              labelColor: AppColors.accent,
              unselectedLabelColor: AppColors.textMuted,
              labelStyle: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
              tabs: const [
                Tab(text: 'Số điện thoại'),
                Tab(text: 'Email'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Họ và tên'),
          ),
          const SizedBox(height: 12),
          if (_byPhone)
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(11),
              ],
              decoration: const InputDecoration(
                labelText: 'Số điện thoại',
                hintText: '09xxxxxxxx',
              ),
            )
          else ...[
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                hintText: 'you@example.com',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: _obscure,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'Mật khẩu',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Obx(() {
            final error = _controller.errorMessage.value;
            return error == null
                ? const SizedBox.shrink()
                : Padding(
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
          Obx(
            () => ElevatedButton(
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
                  : Text(_byPhone ? 'Gửi mã xác thực' : 'Tạo tài khoản'),
            ),
          ),
        ],
      ),
    ),
  );

  void _select(bool byPhone) {
    setState(() => _byPhone = byPhone);
    _controller.reset();
  }

  Future<void> _submit() async {
    if (_byPhone) {
      final started = await _controller.startPhoneRegistration(
        _name.text,
        _phone.text,
      );
      if (started) {
        Get.toNamed(
          AppRoutes.otpVerify,
          arguments: {'phone': _phone.text.trim(), 'register': true},
        );
      }
    } else {
      _controller.registerWithEmail(_name.text, _email.text, _password.text);
    }
  }
}
