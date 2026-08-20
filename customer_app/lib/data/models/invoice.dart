class Invoice {
  Invoice({
    required this.id,
    required this.code,
    required this.customerId,
    required this.branchId,
    required this.totalAmount,
    required this.paidAmount,
    required this.status,
    this.method,
    this.createdAt,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
    id: json['id'] as String,
    code: json['code'] as String? ?? '',
    customerId: json['customerId'] as String? ?? '',
    branchId: json['branchId'] as String? ?? '',
    totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
    paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0,
    status: json['status'] as String? ?? 'UNPAID',
    method: json['method'] as String?,
    createdAt: json['createdAt'] != null
        ? DateTime.tryParse(json['createdAt'] as String)
        : null,
  );

  final String id;
  final String code;
  final String customerId;
  final String branchId;
  final double totalAmount;
  final double paidAmount;
  final String status;
  final String? method;
  final DateTime? createdAt;

  double get remaining => totalAmount - paidAmount;
}
