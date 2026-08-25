import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'core/session/auth_guard.dart';
import 'core/config/customer_app_config_controller.dart';
import 'core/localization/app_translations.dart';
import 'core/localization/language_controller.dart';
import 'core/theme/app_theme.dart';
import 'modules/auth/auth_binding.dart';
import 'modules/auth/otp_verify_screen.dart';
import 'modules/auth/phone_entry_screen.dart';
import 'modules/auth/register_screen.dart';
import 'modules/booking_create/booking_create_screen.dart';
import 'modules/bookings/booking_detail_screen.dart';
import 'modules/invoices/invoice_detail_screen.dart';
import 'modules/profile/profile_edit_screen.dart';
import 'modules/home/content_list_screen.dart';
import 'modules/home/doctor_detail_screen.dart';
import 'modules/home/service_detail_screen.dart';
import 'modules/home/news_detail_screen.dart';
import 'modules/shell/shell_binding.dart';
import 'modules/shell/shell_screen.dart';
import 'routes/app_routes.dart';

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final config = Get.find<CustomerAppConfigController>();
    final language = Get.find<LanguageController>();
    return Obx(
      () => GetMaterialApp(
        title: config.appTitle,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        translations: AppTranslations(),
        locale: language.locale.value,
        fallbackLocale: const Locale('vi', 'VN'),
        initialRoute: AppRoutes.shell,
        getPages: [
          GetPage(
            name: AppRoutes.phoneEntry,
            page: () => const PhoneEntryScreen(),
            binding: AuthBinding(),
          ),
          GetPage(
            name: AppRoutes.otpVerify,
            page: () => const OtpVerifyScreen(),
          ),
          GetPage(
            name: AppRoutes.register,
            page: () => const RegisterScreen(),
            binding: AuthBinding(),
          ),
          GetPage(
            name: AppRoutes.shell,
            page: () => const ShellScreen(),
            binding: ShellBinding(),
          ),
          GetPage(
            name: AppRoutes.bookingCreate,
            page: () => const BookingCreateScreen(),
            middlewares: [AuthGuard()],
          ),
          GetPage(
            name: AppRoutes.bookingDetail,
            page: () => const BookingDetailScreen(),
            middlewares: [AuthGuard()],
          ),
          GetPage(
            name: AppRoutes.invoiceDetail,
            page: () => const InvoiceDetailScreen(),
            middlewares: [AuthGuard()],
          ),
          GetPage(
            name: AppRoutes.profileEdit,
            page: () => const ProfileEditScreen(),
            middlewares: [AuthGuard()],
          ),
          GetPage(
            name: AppRoutes.services,
            page: () => const ContentListScreen(),
          ),
          GetPage(
            name: AppRoutes.serviceDetail,
            page: () => const ServiceDetailScreen(),
          ),
          GetPage(
            name: AppRoutes.doctors,
            page: () => const ContentListScreen(),
          ),
          GetPage(
            name: AppRoutes.doctorDetail,
            page: () => const DoctorDetailScreen(),
          ),
          GetPage(name: AppRoutes.news, page: () => const ContentListScreen()),
          GetPage(name: AppRoutes.posts, page: () => const ContentListScreen()),
          GetPage(
            name: AppRoutes.newsDetail,
            page: () => const NewsDetailScreen(),
          ),
        ],
      ),
    );
  }
}
