class Doctor {
  Doctor({
    required this.id,
    required this.code,
    required this.fullName,
    this.avatarUrl,
    this.position,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) => Doctor(
    id: json['id'] as String,
    code: json['code'] as String? ?? '',
    fullName: json['fullName'] as String? ?? '',
    avatarUrl: json['avatarUrl'] as String?,
    position: json['position'] as String?,
  );

  final String id;
  final String code;
  final String fullName;
  final String? avatarUrl;
  final String? position;
}
