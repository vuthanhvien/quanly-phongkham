class CustomerOverview {
  const CustomerOverview({
    required this.medicalEpisodes,
    required this.consultations,
    required this.treatments,
    required this.serviceOrders,
    required this.images,
  });

  factory CustomerOverview.fromJson(Map<String, dynamic> json) =>
      CustomerOverview(
        medicalEpisodes: _items(
          json['medicalEpisodes'],
        ).map(MedicalEpisode.fromJson).toList(),
        consultations: _items(
          json['consultations'],
        ).map(Consultation.fromJson).toList(),
        treatments: _items(json['treatments']).map(Treatment.fromJson).toList(),
        serviceOrders: _items(
          json['serviceOrders'],
        ).map(ServiceOrder.fromJson).toList(),
        images: _items(
          json['images'],
        ).map(CustomerClinicalImage.fromJson).toList(),
      );

  final List<MedicalEpisode> medicalEpisodes;
  final List<Consultation> consultations;
  final List<Treatment> treatments;
  final List<ServiceOrder> serviceOrders;
  final List<CustomerClinicalImage> images;

  static List<Map<String, dynamic>> _items(dynamic value) =>
      (value as List? ?? [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
}

class MedicalEpisode {
  const MedicalEpisode({
    required this.serviceName,
    this.doctorName,
    this.status,
    this.diagnosis,
    this.operationDate,
    this.allergyWarning,
  });
  factory MedicalEpisode.fromJson(Map<String, dynamic> json) => MedicalEpisode(
    serviceName: json['serviceName'] as String? ?? 'Hồ sơ điều trị',
    doctorName: json['doctorName'] as String?,
    status: json['status'] as String?,
    diagnosis: json['diagnosis'] as String?,
    operationDate: json['operationDate'] as String?,
    allergyWarning: json['allergyWarning'] as String?,
  );
  final String serviceName;
  final String? doctorName, status, diagnosis, operationDate, allergyWarning;
}

class Consultation {
  const Consultation({
    this.consultedAt,
    this.status,
    this.summary,
    this.diagnosis,
    this.nextAction,
  });
  factory Consultation.fromJson(Map<String, dynamic> json) => Consultation(
    consultedAt: json['consultedAt'] as String?,
    status: json['status'] as String?,
    summary: json['summary'] as String?,
    diagnosis: json['diagnosis'] as String?,
    nextAction: json['nextAction'] as String?,
  );
  final String? consultedAt, status, summary, diagnosis, nextAction;
}

class Treatment {
  const Treatment({
    required this.name,
    required this.totalSessions,
    required this.completedSessions,
    this.status,
  });
  factory Treatment.fromJson(Map<String, dynamic> json) => Treatment(
    name: json['name'] as String? ?? 'Liệu trình',
    totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
    completedSessions: (json['completedSessions'] as num?)?.toInt() ?? 0,
    status: json['status'] as String?,
  );
  final String name;
  final int totalSessions, completedSessions;
  final String? status;
}

class ServiceOrder {
  const ServiceOrder({
    required this.code,
    required this.serviceName,
    this.orderDate,
    this.status,
    this.totalAmount,
  });
  factory ServiceOrder.fromJson(Map<String, dynamic> json) => ServiceOrder(
    code: json['code'] as String? ?? '',
    serviceName: json['serviceName'] as String? ?? 'Dịch vụ',
    orderDate: json['orderDate'] as String?,
    status: json['status'] as String?,
    totalAmount: (json['totalAmount'] as num?)?.toDouble(),
  );
  final String code, serviceName;
  final String? orderDate, status;
  final double? totalAmount;
}

class CustomerClinicalImage {
  const CustomerClinicalImage({
    this.title,
    this.imageUrl,
    this.mediaType,
    this.capturedAt,
    this.diagnosisNote,
  });
  factory CustomerClinicalImage.fromJson(Map<String, dynamic> json) =>
      CustomerClinicalImage(
        title: json['title'] as String?,
        imageUrl: json['imageUrl'] as String?,
        mediaType: json['mediaType'] as String?,
        capturedAt: json['capturedAt'] as String?,
        diagnosisNote: json['diagnosisNote'] as String?,
      );
  final String? title, imageUrl, mediaType, capturedAt, diagnosisNote;
}
