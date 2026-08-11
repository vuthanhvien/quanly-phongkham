import 'package:flutter/material.dart';

/// Mirrors the CMS brand tokens in cms/src/styles.css so the customer app
/// reads as the same product, not a different theme.
class AppColors {
  AppColors._();

  static const primary = Color(0xFFE889AE);
  static const primaryDark = Color(0xFFC2517D);
  static const primarySoft = Color(0xFFF6D6E2);
  static const primarySofter = Color(0xFFF3C6D7);

  static const pageBackground = Color(0xFFF5F6FA);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFDBE1EA);

  static const title = Color(0xFF111827);
  static const text = Color(0xFF1F2430);
  static const textMuted = Color(0xFF6B7280);

  static const success = Color(0xFF2F8A1F);
  static const successBg = Color(0x2967C25A);
  static const warning = Color(0xFFAD6A11);
  static const warningBg = Color(0x29D7A45B);
  static const error = Color(0xFFC23934);
  static const errorBg = Color(0x24FF7875);
  static const info = Color(0xFF0F7A72);
}
