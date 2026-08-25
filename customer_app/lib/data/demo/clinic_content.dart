import '../../core/api/env.dart';

class ClinicPost {
  const ClinicPost({
    this.id = '',
    required this.category,
    required this.title,
    required this.excerpt,
    required this.readTime,
    required this.imageUrl,
    this.content = '',
  });
  factory ClinicPost.fromJson(Map<String, dynamic> json) => ClinicPost(
    id: json['id'] as String? ?? '',
    category: json['category'] as String? ?? 'Tin từ phòng khám',
    title: json['title'] as String? ?? '',
    excerpt: json['excerpt'] as String? ?? '',
    readTime: json['publishedAt'] as String? ?? '',
    imageUrl: Env.resolvePublicUrl(json['imageUrl'] as String? ?? ''),
    content: json['content'] as String? ?? '',
  );
  final String id;
  final String category;
  final String title;
  final String excerpt;
  final String readTime;
  final String imageUrl;
  final String content;
}

class ClinicDoctor {
  const ClinicDoctor({
    required this.id,
    required this.name,
    required this.specialty,
    required this.experience,
    required this.color,
    required this.imageUrl,
    this.excerpt = '',
    this.content = '',
  });
  factory ClinicDoctor.fromJson(Map<String, dynamic> json) => ClinicDoctor(
    id: json['id'] as String? ?? '',
    name: json['fullName'] as String? ?? '',
    specialty: json['position'] as String? ?? 'Bác sĩ chuyên môn',
    experience: json['experience'] as String? ?? '',
    color: 0xFFE8A7C0,
    imageUrl: Env.resolvePublicUrl(json['avatarUrl'] as String? ?? ''),
    excerpt: json['excerpt'] as String? ?? '',
    content: json['content'] as String? ?? '',
  );
  final String id;
  final String name;
  final String specialty;
  final String experience;
  final int color;
  final String imageUrl;
  final String excerpt;
  final String content;
}

class ClinicService {
  const ClinicService({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.imageUrl,
    this.price = 0,
    this.content = '',
  });
  factory ClinicService.fromJson(Map<String, dynamic> json) => ClinicService(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    description: json['excerpt'] as String? ?? 'Dịch vụ chăm sóc',
    icon: '✦',
    imageUrl: Env.resolvePublicUrl(json['imageUrl'] as String? ?? ''),
    // Decimal database columns are serialized by the API as strings
    // (for example "2000000.00"), while demo/local data may be numeric.
    price: _asDouble(json['sellingPrice']),
    content: json['content'] as String? ?? '',
  );
  final String id;
  final String name;
  final String description;
  final String icon;
  final String imageUrl;
  final double price;
  final String content;
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

class ClinicVideo {
  const ClinicVideo({
    required this.id,
    required this.title,
    required this.excerpt,
    required this.imageUrl,
    required this.videoUrl,
  });

  factory ClinicVideo.fromJson(Map<String, dynamic> json) => ClinicVideo(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? '',
    excerpt: json['excerpt'] as String? ?? '',
    imageUrl: Env.resolvePublicUrl(json['imageUrl'] as String? ?? ''),
    videoUrl: Env.resolvePublicUrl(json['videoUrl'] as String? ?? ''),
  );

  final String id;
  final String title;
  final String excerpt;
  final String imageUrl;
  final String videoUrl;
}

const clinicPosts = [
  ClinicPost(
    category: 'CẨM NANG SỨC KHỎE',
    title: 'Chăm sóc làn da khỏe mạnh trong mùa nắng',
    excerpt: 'Những bước đơn giản giúp da được bảo vệ và phục hồi mỗi ngày.',
    readTime: '4 phút đọc',
    imageUrl:
        'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicPost(
    category: 'TIN PHÒNG KHÁM',
    title: 'Ưu đãi chăm sóc da chuyên sâu tháng này',
    excerpt: 'Khám phá liệu trình được thiết kế riêng cho làn da của bạn.',
    readTime: '2 ngày trước',
    imageUrl:
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicPost(
    category: 'CÂU CHUYỆN KHÁCH HÀNG',
    title: 'Một hành trình tự tin bắt đầu từ buổi tư vấn',
    excerpt: 'Lắng nghe câu chuyện chăm sóc sức khỏe theo cách cá nhân hóa.',
    readTime: '6 phút đọc',
    imageUrl:
        'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicPost(
    category: 'KIẾN THỨC',
    title: 'Khi nào bạn nên tái khám da liễu?',
    excerpt: 'Dấu hiệu giúp bạn chủ động chăm sóc làn da.',
    readTime: '3 phút đọc',
    imageUrl:
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=80',
  ),
];

const clinicDoctors = [
  ClinicDoctor(
    id: 'demo-doctor-1',
    name: 'BS. Nguyễn Minh Anh',
    specialty: 'Da liễu thẩm mỹ',
    experience: '12 năm kinh nghiệm',
    color: 0xFFE8A7C0,
    imageUrl:
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicDoctor(
    id: 'demo-doctor-2',
    name: 'BS. Trần Gia Hân',
    specialty: 'Chăm sóc da chuyên sâu',
    experience: '9 năm kinh nghiệm',
    color: 0xFFC7B7E8,
    imageUrl:
        'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicDoctor(
    id: 'demo-doctor-3',
    name: 'BS. Lê Khánh Vy',
    specialty: 'Nội khoa',
    experience: '10 năm kinh nghiệm',
    color: 0xFFA7D8D0,
    imageUrl:
        'https://images.unsplash.com/photo-1618498082410-b4aa22193b38?auto=format&fit=crop&w=500&q=80',
  ),
];

const clinicServices = [
  ClinicService(
    id: 'demo-service-1',
    name: 'Khám & tư vấn',
    description: 'Lộ trình cá nhân hóa',
    icon: '✦',
    imageUrl:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicService(
    id: 'demo-service-2',
    name: 'Chăm sóc da',
    description: 'Phục hồi & nuôi dưỡng',
    icon: '♡',
    imageUrl:
        'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicService(
    id: 'demo-service-3',
    name: 'Điều trị chuyên sâu',
    description: 'Công nghệ hiện đại',
    icon: '◌',
    imageUrl:
        'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=500&q=80',
  ),
];
