import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'core/session/session_controller.dart';
import 'core/theme/app_theme.dart';
import 'modules/auth/auth_binding.dart';
import 'modules/auth/otp_verify_screen.dart';
import 'modules/auth/phone_entry_screen.dart';
import 'modules/booking_create/booking_create_screen.dart';
import 'modules/bookings/booking_detail_screen.dart';
import 'modules/invoices/invoice_detail_screen.dart';
import 'modules/profile/profile_edit_screen.dart';
import 'modules/shell/shell_binding.dart';
import 'modules/shell/shell_screen.dart';
import 'routes/app_routes.dart';

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final session = Get.find<SessionController>();
    return GetMaterialApp(
      title: 'Đặt lịch khám',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      initialRoute: session.isLoggedIn ? AppRoutes.shell : AppRoutes.phoneEntry,
      getPages: [
        GetPage(
          name: AppRoutes.phoneEntry,
          page: () => const PhoneEntryScreen(),
          binding: AuthBinding(),
        ),
        GetPage(name: AppRoutes.otpVerify, page: () => const OtpVerifyScreen()),
        GetPage(
          name: AppRoutes.shell,
          page: () => const ShellScreen(),
          binding: ShellBinding(),
        ),
        GetPage(
          name: AppRoutes.bookingCreate,
          page: () => const BookingCreateScreen(),
        ),
        GetPage(
          name: AppRoutes.bookingDetail,
          page: () => const BookingDetailScreen(),
        ),
        GetPage(
          name: AppRoutes.invoiceDetail,
          page: () => const InvoiceDetailScreen(),
        ),
        GetPage(
          name: AppRoutes.profileEdit,
          page: () => const ProfileEditScreen(),
        ),
      ],
    );
  }
}
