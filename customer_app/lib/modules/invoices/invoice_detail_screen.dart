import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/error_utils.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/invoice.dart';
import '../../data/repositories/invoice_repository.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/status_badge.dart';

class InvoiceDetailScreen extends StatefulWidget {
  const InvoiceDetailScreen({super.key});

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  final _repository = InvoiceRepository();
  Invoice? _invoice;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = Get.arguments as String;
    setState(() => _loading = true);
    try {
      final invoice = await _repository.detail(id);
      setState(() {
        _invoice = invoice;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = describeError(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết hóa đơn')),
      body: _loading
          ? const LoadingView()
          : _invoice == null
              ? Center(child: Text(_error ?? 'Không tìm thấy hóa đơn'))
              : _buildDetail(_invoice!),
    );
  }

  Widget _buildDetail(Invoice invoice) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(invoice.code, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    StatusBadge(info: invoiceStatusInfo(invoice.status)),
                  ],
                ),
                const Divider(height: 28),
                _row('Tổng tiền', formatCurrency(invoice.totalAmount)),
                _row('Đã thanh toán', formatCurrency(invoice.paidAmount)),
                _row('Còn lại', formatCurrency(invoice.remaining), emphasize: true),
                if (invoice.createdAt != null) _row('Ngày lập', formatDate(invoice.createdAt!)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _row(String label, String value, {bool emphasize = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
          Text(
            value,
            style: TextStyle(
              fontSize: 14.5,
              fontWeight: emphasize ? FontWeight.w700 : FontWeight.w500,
              color: emphasize ? AppColors.primaryDark : AppColors.text,
            ),
          ),
        ],
      ),
    );
  }
}
