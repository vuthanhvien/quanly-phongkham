class Branch {
  Branch({required this.id, required this.name, this.address, this.phone});

  factory Branch.fromJson(Map<String, dynamic> json) => Branch(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    address: json['address'] as String?,
    phone: json['phone'] as String?,
  );

  final String id;
  final String name;
  final String? address;
  final String? phone;
}
