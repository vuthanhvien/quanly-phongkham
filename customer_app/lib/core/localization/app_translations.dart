import 'package:get/get.dart';

class AppTranslations extends Translations {
  @override
  Map<String, Map<String, String>> get keys => {
    'vi_VN': {
      'language': 'Ngôn ngữ',
      'vietnamese': 'Tiếng Việt',
      'english': 'English',
      'login': 'Đăng nhập',
      'register': 'Đăng ký',
      'login_required_title': 'Đăng nhập để tiếp tục',
      'login_required_bookings':
          'Theo dõi, đặt và quản lý lịch hẹn của bạn tại một nơi.',
      'login_required_chat':
          'Nhắn tin bảo mật với đội ngũ chăm sóc của phòng khám.',
      'login_required_profile':
          'Xem hồ sơ sức khỏe, quá trình điều trị và hóa đơn cá nhân.',
      'login_benefits': 'Sau khi đăng nhập, bạn có thể:',
      'benefit_bookings': 'Quản lý lịch hẹn nhanh chóng',
      'benefit_records': 'Theo dõi hồ sơ chăm sóc riêng tư',
      'benefit_support': 'Nhận hỗ trợ trực tiếp từ phòng khám',
    },
    'en_US': {
      'language': 'Language',
      'vietnamese': 'Tiếng Việt',
      'english': 'English',
      'login': 'Sign in',
      'register': 'Create account',
      'login_required_title': 'Sign in to continue',
      'login_required_bookings':
          'Book, view, and manage all of your appointments in one place.',
      'login_required_chat': 'Message your clinic care team securely.',
      'login_required_profile':
          'View your personal health profile, care journey, and invoices.',
      'login_benefits': 'After signing in, you can:',
      'benefit_bookings': 'Manage appointments easily',
      'benefit_records': 'Follow your private care records',
      'benefit_support': 'Get direct support from your clinic',
    },
  };
}
