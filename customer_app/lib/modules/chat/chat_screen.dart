import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_icons.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tin nhắn'),
          Text(
            'Chúng tôi luôn sẵn sàng hỗ trợ',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: const [
        _SupportCard(),
        SizedBox(height: 22),
        Text(
          'Cuộc trò chuyện',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        SizedBox(height: 10),
        _Conversation(
          name: 'Chăm sóc khách hàng',
          message: 'Chào bạn, phòng khám có thể hỗ trợ gì?',
          time: '09:42',
          color: 0xFFE889AE,
          unread: true,
        ),
        _Conversation(
          name: 'BS. Nguyễn Minh Anh',
          message: 'Tôi đã xem thông tin bạn gửi.',
          time: 'Hôm qua',
          color: 0xFFC7B7E8,
        ),
      ],
    ),
  );
}

class _SupportCard extends StatelessWidget {
  const _SupportCard();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: AppColors.title,
      borderRadius: BorderRadius.circular(22),
    ),
    child: Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: const BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
          ),
          child: const Icon(AppIcons.heartbeat, color: Colors.white),
        ),
        const SizedBox(width: 14),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Kết nối cùng chuyên viên',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'Nhận tư vấn nhanh từ đội ngũ phòng khám',
                style: TextStyle(
                  color: Color(0xFFD8DCE5),
                  fontSize: 12.5,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
        Icon(Icons.arrow_forward_rounded, color: Colors.white),
      ],
    ),
  );
}

class _Conversation extends StatelessWidget {
  const _Conversation({
    required this.name,
    required this.message,
    required this.time,
    required this.color,
    this.unread = false,
  });
  final String name, message, time;
  final int color;
  final bool unread;
  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      leading: CircleAvatar(
        backgroundColor: Color(color),
        child: Text(
          name.split(' ').last.characters.first,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(message, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            time,
            style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
          ),
          if (unread)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: CircleAvatar(
                radius: 4,
                backgroundColor: AppColors.primaryDark,
              ),
            ),
        ],
      ),
    ),
  );
}
