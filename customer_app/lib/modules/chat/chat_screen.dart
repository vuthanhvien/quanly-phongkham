import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tin nhắn'), centerTitle: true),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      children: const [
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
  Widget build(BuildContext context) => Column(
    children: [
      ListTile(
        contentPadding: const EdgeInsets.symmetric(vertical: 10),
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
              style: const TextStyle(
                fontSize: 11.5,
                color: AppColors.textMuted,
              ),
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
      const Divider(height: 1),
    ],
  );
}
