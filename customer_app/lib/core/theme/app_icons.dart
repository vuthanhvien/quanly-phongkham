import 'package:flutter/material.dart';

/// Semantic icon names -> Material Symbols (outlined weight), kept in one
/// place so the icon language stays consistent (thin lines, no emoji, no
/// mixed sets). Uses Flutter's built-in Icons rather than a third-party
/// pack so it always matches the installed Flutter SDK.
class AppIcons {
  AppIcons._();

  static const home = Icons.home_outlined;
  static const homeFill = Icons.home_rounded;
  static const calendar = Icons.calendar_today_outlined;
  static const calendarFill = Icons.calendar_today_rounded;
  static const invoice = Icons.receipt_long_outlined;
  static const invoiceFill = Icons.receipt_long_rounded;
  static const profile = Icons.account_circle_outlined;
  static const profileFill = Icons.account_circle_rounded;

  static const phone = Icons.phone_outlined;
  static const shield = Icons.verified_user_outlined;
  static const clock = Icons.schedule_outlined;
  static const mapPin = Icons.place_outlined;
  static const doctor = Icons.medical_services_outlined;
  static const note = Icons.edit_note_outlined;
  static const chevronRight = Icons.chevron_right_rounded;
  static const chevronLeft = Icons.chevron_left_rounded;
  static const plus = Icons.add_rounded;
  static const check = Icons.check_circle_outline_rounded;
  static const cancel = Icons.cancel_outlined;
  static const logout = Icons.logout_rounded;
  static const edit = Icons.edit_outlined;
  static const heartbeat = Icons.favorite_border_rounded;
  static const empty = Icons.inbox_outlined;
  static const warning = Icons.error_outline_rounded;
}
