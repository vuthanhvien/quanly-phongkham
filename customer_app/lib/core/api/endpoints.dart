class Endpoints {
  Endpoints._();

  static const otpRequest = '/customer-portal/auth/otp/request';
  static const otpVerify = '/customer-portal/auth/otp/verify';
  static const emailLogin = '/customer-portal/auth/email/login';
  static const registerPhoneRequest =
      '/customer-portal/auth/register/phone/request';
  static const registerPhoneVerify =
      '/customer-portal/auth/register/phone/verify';
  static const registerEmail = '/customer-portal/auth/register/email';

  static const me = '/customer-portal/me';
  static const customerOverview = '/customer-portal/me/overview';
  static const appointments = '/customer-portal/appointments';
  static String appointment(String id) => '/customer-portal/appointments/$id';
  static String cancelAppointment(String id) =>
      '/customer-portal/appointments/$id/cancel';
  static const invoices = '/customer-portal/invoices';
  static String invoice(String id) => '/customer-portal/invoices/$id';
  static const branches = '/customer-portal/branches';
  static const services = '/customer-portal/services';
  static const doctors = '/customer-portal/doctors';
  static const posts = '/customer-portal/posts';
  static const news = '/customer-portal/news';
  static const videos = '/customer-portal/videos';
}
