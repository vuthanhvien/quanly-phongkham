class Appointment {
  Appointment({
    required this.id,
    required this.customerId,
    required this.branchId,
    required this.type,
    this.startTime,
    this.endTime,
    required this.status,
    this.doctorStaffId,
    this.roomId,
    this.note,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
    id: json['id'] as String,
    customerId: json['customerId'] as String? ?? '',
    branchId: json['branchId'] as String? ?? '',
    type: json['type'] as String? ?? 'CONSULTATION',
    startTime: json['startTime'] != null
        ? DateTime.tryParse(json['startTime'] as String)
        : null,
    endTime: json['endTime'] != null
        ? DateTime.tryParse(json['endTime'] as String)
        : null,
    status: json['status'] as String? ?? 'SCHEDULED',
    doctorStaffId: json['doctorStaffId'] as String?,
    roomId: json['roomId'] as String?,
    note: json['note'] as String?,
  );

  final String id;
  final String customerId;
  final String branchId;
  final String type;
  final DateTime? startTime;
  final DateTime? endTime;
  final String status;
  final String? doctorStaffId;
  final String? roomId;
  final String? note;

  bool get isUpcoming =>
      startTime != null &&
      startTime!.isAfter(DateTime.now()) &&
      status != 'CANCELLED';
  bool get isCancellable => isUpcoming && status != 'COMPLETED';
}
