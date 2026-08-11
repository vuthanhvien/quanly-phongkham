class Endpoints {
  Endpoints._();

  static const otpRequest = '/customer-portal/auth/otp/request';
  static const otpVerify = '/customer-portal/auth/otp/verify';

  static const me = '/customer-portal/me';
  static const appointments = '/customer-portal/appointments';
  static String appointment(String id) => '/customer-portal/appointments/$id';
  static String cancelAppointment(String id) => '/customer-portal/appointments/$id/cancel';
  static const invoices = '/customer-portal/invoices';
  static String invoice(String id) => '/customer-portal/invoices/$id';
  static const branches = '/customer-portal/branches';
  static const doctors = '/customer-portal/doctors';
}
