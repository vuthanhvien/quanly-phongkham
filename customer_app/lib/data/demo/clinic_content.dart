class ClinicPost {
  const ClinicPost({
    required this.category,
    required this.title,
    required this.excerpt,
    required this.readTime,
    required this.imageUrl,
  });
  final String category;
  final String title;
  final String excerpt;
  final String readTime;
  final String imageUrl;
}

class ClinicDoctor {
  const ClinicDoctor({
    required this.name,
    required this.specialty,
    required this.experience,
    required this.color,
    required this.imageUrl,
  });
  final String name;
  final String specialty;
  final String experience;
  final int color;
  final String imageUrl;
}

class ClinicService {
  const ClinicService({
    required this.name,
    required this.description,
    required this.icon,
    required this.imageUrl,
  });
  final String name;
  final String description;
  final String icon;
  final String imageUrl;
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
    name: 'BS. Nguyễn Minh Anh',
    specialty: 'Da liễu thẩm mỹ',
    experience: '12 năm kinh nghiệm',
    color: 0xFFE8A7C0,
    imageUrl:
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicDoctor(
    name: 'BS. Trần Gia Hân',
    specialty: 'Chăm sóc da chuyên sâu',
    experience: '9 năm kinh nghiệm',
    color: 0xFFC7B7E8,
    imageUrl:
        'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicDoctor(
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
    name: 'Khám & tư vấn',
    description: 'Lộ trình cá nhân hóa',
    icon: '✦',
    imageUrl:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicService(
    name: 'Chăm sóc da',
    description: 'Phục hồi & nuôi dưỡng',
    icon: '♡',
    imageUrl:
        'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=500&q=80',
  ),
  ClinicService(
    name: 'Điều trị chuyên sâu',
    description: 'Công nghệ hiện đại',
    icon: '◌',
    imageUrl:
        'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=500&q=80',
  ),
];
