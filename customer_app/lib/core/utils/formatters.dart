import 'package:intl/intl.dart';

final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ', decimalDigits: 0);
final _dateFormat = DateFormat('dd/MM/yyyy');
final _timeFormat = DateFormat('HH:mm');
final _dateTimeFormat = DateFormat('HH:mm, dd/MM/yyyy');

String formatCurrency(num amount) => _currencyFormat.format(amount);
String formatDate(DateTime date) => _dateFormat.format(date);
String formatTime(DateTime date) => _timeFormat.format(date);
String formatDateTime(DateTime date) => _dateTimeFormat.format(date);
