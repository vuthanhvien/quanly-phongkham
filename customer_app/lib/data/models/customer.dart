class Customer {
  Customer({
    required this.id,
    required this.code,
    required this.fullName,
    this.avatarUrl,
    required this.phone,
    this.email,
    this.gender,
    this.idNumber,
    this.address,
    this.addressLine,
    required this.tier,
    required this.status,
    this.totalSpent,
    this.loyaltyPoints = 0,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
    id: json['id'] as String,
    code: json['code'] as String? ?? '',
    fullName: json['fullName'] as String? ?? '',
    avatarUrl: json['avatarUrl'] as String?,
    phone: json['phone'] as String? ?? '',
    email: json['email'] as String?,
    gender: json['gender'] as String?,
    idNumber: json['idNumber'] as String?,
    address: json['address'] as String?,
    addressLine: json['addressLine'] as String?,
    tier: json['tier'] as String? ?? 'MEMBER',
    status: json['status'] as String? ?? '',
    totalSpent: (json['totalSpent'] as num?)?.toDouble(),
    loyaltyPoints: (json['loyaltyPoints'] as num?)?.toInt() ?? 0,
  );

  final String id;
  final String code;
  final String fullName;
  final String? avatarUrl;
  final String phone;
  final String? email;
  final String? gender;
  final String? idNumber;
  final String? address;
  final String? addressLine;
  final String tier;
  final String status;
  final double? totalSpent;
  final int loyaltyPoints;
}
