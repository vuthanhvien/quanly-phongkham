import 'package:flutter/material.dart';

const blue = Color(0xFF0D76B7);
const navy = Color(0xFF102D4B);
const canvas = Color(0xFFF3F8FD);

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Staff App',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: blue),
      scaffoldBackgroundColor: canvas,
      useMaterial3: true,
    ),
    home: const LoginPage(),
  );
}

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            const BrandMark(),
            const SizedBox(height: 28),
            const Text(
              'Bắt đầu ca trực',
              style: TextStyle(
                color: navy,
                fontSize: 31,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Đăng nhập để theo dõi lịch hẹn và hỗ trợ bệnh nhân.',
              style: TextStyle(color: Color(0xFF66839A)),
            ),
            const SizedBox(height: 28),
            const Input(
              label: 'Email công việc',
              hint: 'minhanh@clinic.vn',
              icon: Icons.mail_outline,
            ),
            const SizedBox(height: 12),
            const Input(
              label: 'Mật khẩu',
              hint: '••••••••',
              icon: Icons.lock_outline,
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {},
                child: const Text('Quên mật khẩu?'),
              ),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: blue,
                padding: const EdgeInsets.symmetric(vertical: 17),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: () => Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const StaffShell()),
              ),
              child: const Text(
                'Đăng nhập',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            const Spacer(flex: 2),
            const Center(
              child: Text(
                'Staff App · Phòng khám 01',
                style: TextStyle(fontSize: 12, color: Color(0xFF86A0B1)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key});
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: 43,
        height: 43,
        decoration: BoxDecoration(
          color: blue,
          borderRadius: BorderRadius.circular(15),
        ),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      const SizedBox(width: 11),
      const Text(
        'Staff App',
        style: TextStyle(
          color: navy,
          fontSize: 19,
          fontWeight: FontWeight.w800,
        ),
      ),
    ],
  );
}

class Input extends StatelessWidget {
  const Input({
    super.key,
    required this.label,
    required this.hint,
    required this.icon,
  });
  final String label, hint;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(
          color: navy,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 7),
      TextField(
        obscureText: label == 'Mật khẩu',
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: const Color(0xFF7893A6)),
          hintText: hint,
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    ],
  );
}

class Patient {
  const Patient(
    this.name,
    this.initials,
    this.time,
    this.detail,
    this.room,
    this.color,
  );
  final String name, initials, time, detail, room;
  final Color color;
}

const patients = [
  Patient(
    'Nguyễn An',
    'NA',
    '09:30',
    'Khám nội · BS. Huy',
    'P.203',
    Color(0xFF35C69C),
  ),
  Patient(
    'Trần Linh',
    'TL',
    '10:00',
    'Tái khám · BS. Mai',
    'P.105',
    Color(0xFFF2B84A),
  ),
  Patient(
    'Lê Đức',
    'LĐ',
    '10:15',
    'Kiểm tra kết quả',
    'P.201',
    Color(0xFF5B9DE0),
  ),
  Patient(
    'Phạm Vy',
    'PV',
    '10:30',
    'Khám nhi · BS. Lan',
    'P.102',
    Color(0xFFA980DA),
  ),
];

class StaffShell extends StatefulWidget {
  const StaffShell({super.key});
  @override
  State<StaffShell> createState() => _StaffShellState();
}

class _StaffShellState extends State<StaffShell> {
  int tab = 0, checkedIn = 18;
  void profile(Patient p) => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => PatientProfilePage(patient: p)),
  );
  @override
  Widget build(BuildContext context) {
    final pages = [
      Dashboard(
        checkedIn: checkedIn,
        onCheckIn: () => setState(() => checkedIn++),
        onProfile: profile,
      ),
      CheckIn(
        checkedIn: checkedIn,
        onCheckIn: () => setState(() => checkedIn++),
      ),
      Appointments(onProfile: profile),
      const WorkSchedule(),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final desktop = constraints.maxWidth >= 1024;
        final selectedPage = desktop && tab == 0
            ? DesktopDashboard(
                checkedIn: checkedIn,
                onCheckIn: () => setState(() => checkedIn++),
                onProfile: profile,
              )
            : pages[tab];
        final content = desktop
            ? Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1160),
                  child: selectedPage,
                ),
              )
            : selectedPage;
        if (!desktop) {
          return Scaffold(
            body: SafeArea(child: content),
            bottomNavigationBar: NavigationBar(
              selectedIndex: tab,
              onDestinationSelected: (v) => setState(() => tab = v),
              indicatorColor: const Color(0xFFBDEBFA),
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home),
                  label: 'Tổng quan',
                ),
                NavigationDestination(
                  icon: Icon(Icons.add_box_outlined),
                  selectedIcon: Icon(Icons.add_box),
                  label: 'Check-in',
                ),
                NavigationDestination(
                  icon: Icon(Icons.calendar_month_outlined),
                  selectedIcon: Icon(Icons.calendar_month),
                  label: 'Lịch hẹn',
                ),
                NavigationDestination(
                  icon: Icon(Icons.badge_outlined),
                  selectedIcon: Icon(Icons.badge),
                  label: 'Ca làm',
                ),
              ],
            ),
          );
        }
        return Scaffold(
          body: SafeArea(
            child: Row(
              children: [
                NavigationRail(
                  selectedIndex: tab,
                  onDestinationSelected: (v) => setState(() => tab = v),
                  backgroundColor: navy,
                  indicatorColor: const Color(0xFF31BCE0),
                  selectedIconTheme: const IconThemeData(color: navy),
                  selectedLabelTextStyle: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                  unselectedIconTheme: const IconThemeData(
                    color: Color(0xFFB7CADB),
                  ),
                  unselectedLabelTextStyle: const TextStyle(
                    color: Color(0xFFB7CADB),
                  ),
                  leading: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 18, 14, 28),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: blue,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Staff App',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  trailing: const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: CircleAvatar(
                      backgroundColor: Color(0xFFDFF1F8),
                      foregroundColor: blue,
                      child: Text(
                        'MA',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                  labelType: NavigationRailLabelType.all,
                  destinations: const [
                    NavigationRailDestination(
                      icon: Icon(Icons.home_outlined),
                      selectedIcon: Icon(Icons.home),
                      label: Text('Tổng quan'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.add_box_outlined),
                      selectedIcon: Icon(Icons.add_box),
                      label: Text('Check-in'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.calendar_month_outlined),
                      selectedIcon: Icon(Icons.calendar_month),
                      label: Text('Lịch hẹn'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.badge_outlined),
                      selectedIcon: Icon(Icons.badge),
                      label: Text('Ca làm'),
                    ),
                  ],
                ),
                const VerticalDivider(width: 1),
                Expanded(child: content),
              ],
            ),
          ),
        );
      },
    );
  }
}

class Dashboard extends StatelessWidget {
  const Dashboard({
    super.key,
    required this.checkedIn,
    required this.onCheckIn,
    required this.onProfile,
  });
  final int checkedIn;
  final VoidCallback onCheckIn;
  final ValueChanged<Patient> onProfile;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ca trực',
                style: TextStyle(
                  fontSize: 27,
                  fontWeight: FontWeight.w800,
                  color: navy,
                ),
              ),
              SizedBox(height: 3),
              Text(
                'Thứ Ba · 20 tháng 8 · Phòng khám 01',
                style: TextStyle(fontSize: 12, color: Color(0xFF66839A)),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
            decoration: BoxDecoration(
              color: blue,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'ĐANG LÀM',
              style: TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 20),
      CheckInHero(checkedIn: checkedIn, onCheckIn: onCheckIn),
      const SizedBox(height: 15),
      const Row(
        children: [
          Expanded(
            child: Metric(
              label: 'Lịch hẹn',
              value: '69%',
              hint: 'đã hoàn thành',
              ring: true,
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Metric(
              label: 'Chờ xử lý',
              value: '06',
              hint: 'hồ sơ cần gọi',
            ),
          ),
        ],
      ),
      const SizedBox(height: 22),
      const SectionHeader('Dòng lịch hẹn', 'Mở lịch'),
      const SizedBox(height: 10),
      ...patients
          .take(3)
          .map((p) => AppointmentCard(patient: p, onTap: () => onProfile(p))),
    ],
  );
}

class DesktopDashboard extends StatelessWidget {
  const DesktopDashboard({
    super.key,
    required this.checkedIn,
    required this.onCheckIn,
    required this.onProfile,
  });
  final int checkedIn;
  final VoidCallback onCheckIn;
  final ValueChanged<Patient> onProfile;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(36),
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ca trực',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: navy,
                ),
              ),
              SizedBox(height: 5),
              Text(
                'Thứ Ba · 20 tháng 8 · Phòng khám 01',
                style: TextStyle(color: Color(0xFF66839A)),
              ),
            ],
          ),
          OutlinedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.file_download_outlined),
            label: const Text('Xuất báo cáo'),
          ),
        ],
      ),
      const SizedBox(height: 28),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 7,
            child: Column(
              children: [
                CheckInHero(checkedIn: checkedIn, onCheckIn: onCheckIn),
                const SizedBox(height: 16),
                const Row(
                  children: [
                    Expanded(
                      child: Metric(
                        label: 'Lịch hẹn',
                        value: '69%',
                        hint: 'đã hoàn thành',
                        ring: true,
                      ),
                    ),
                    SizedBox(width: 14),
                    Expanded(
                      child: Metric(
                        label: 'Chờ xử lý',
                        value: '06',
                        hint: 'hồ sơ cần gọi',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 26),
                const SectionHeader('Dòng lịch hẹn', 'Mở lịch đầy đủ'),
                const SizedBox(height: 10),
                ...patients.map(
                  (p) => AppointmentCard(patient: p, onTap: () => onProfile(p)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 24),
          Expanded(flex: 4, child: _DesktopSidePanel(checkedIn: checkedIn)),
        ],
      ),
    ],
  );
}

class _DesktopSidePanel extends StatelessWidget {
  const _DesktopSidePanel({required this.checkedIn});
  final int checkedIn;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: navy,
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'CA HIỆN TẠI',
              style: TextStyle(
                color: Color(0xFFBDEBFA),
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(height: 7),
            Text(
              '08:00 — 17:00',
              style: TextStyle(
                color: Colors.white,
                fontSize: 23,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 5),
            Text(
              'Quầy tiếp đón · Phòng khám 01',
              style: TextStyle(color: Color(0xFFB7CADB), fontSize: 12),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tổng quan ca',
              style: TextStyle(
                color: navy,
                fontWeight: FontWeight.w800,
                fontSize: 17,
              ),
            ),
            const SizedBox(height: 18),
            _ProgressLine(
              label: 'Đã check-in',
              value: '$checkedIn / 26',
              progress: checkedIn / 26,
            ),
            const SizedBox(height: 16),
            const _ProgressLine(
              label: 'Đã khám',
              value: '12 / 26',
              progress: 12 / 26,
            ),
            const SizedBox(height: 16),
            const _ProgressLine(label: 'Đúng giờ', value: '92%', progress: .92),
          ],
        ),
      ),
    ],
  );
}

class _ProgressLine extends StatelessWidget {
  const _ProgressLine({
    required this.label,
    required this.value,
    required this.progress,
  });
  final String label, value;
  final double progress;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: Color(0xFF66839A), fontSize: 12),
          ),
          Text(
            value,
            style: const TextStyle(
              color: navy,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
      const SizedBox(height: 7),
      ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(
          value: progress,
          minHeight: 8,
          color: const Color(0xFF1AA5C8),
          backgroundColor: const Color(0xFFE0EDF4),
        ),
      ),
    ],
  );
}

class CheckInHero extends StatelessWidget {
  const CheckInHero({
    super.key,
    required this.checkedIn,
    required this.onCheckIn,
  });
  final int checkedIn;
  final VoidCallback onCheckIn;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: blue,
      borderRadius: BorderRadius.circular(27),
      boxShadow: const [
        BoxShadow(
          color: Color(0x330D76B7),
          blurRadius: 22,
          offset: Offset(0, 10),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'CHECK-IN HÔM NAY',
          style: TextStyle(
            color: Color(0xFFD3F2FF),
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          '$checkedIn / 26 bệnh nhân',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 26,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 13),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: blue,
            side: BorderSide.none,
          ),
          onPressed: onCheckIn,
          icon: const Icon(Icons.add, size: 17),
          label: const Text(
            'Check-in bệnh nhân',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
      ],
    ),
  );
}

class Metric extends StatelessWidget {
  const Metric({
    super.key,
    required this.label,
    required this.value,
    required this.hint,
    this.ring = false,
  });
  final String label, value, hint;
  final bool ring;
  @override
  Widget build(BuildContext context) => Container(
    height: 108,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(19),
    ),
    child: Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Color(0xFF66839A)),
            ),
            const SizedBox(height: 5),
            Text(
              value,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            Text(
              hint,
              style: const TextStyle(fontSize: 11, color: Color(0xFF66839A)),
            ),
          ],
        ),
        if (ring)
          const Positioned(
            right: 1,
            top: 5,
            child: SizedBox(
              width: 45,
              height: 45,
              child: CircularProgressIndicator(
                value: .69,
                strokeWidth: 5,
                color: Color(0xFF1AA5C8),
                backgroundColor: Color(0xFFD9EAF4),
              ),
            ),
          ),
      ],
    ),
  );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, this.action, {super.key});
  final String title, action;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        title,
        style: const TextStyle(
          color: navy,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
      ),
      Text(
        action,
        style: const TextStyle(
          color: blue,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    ],
  );
}

class AppointmentCard extends StatelessWidget {
  const AppointmentCard({
    super.key,
    required this.patient,
    required this.onTap,
  });
  final Patient patient;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              SizedBox(
                width: 46,
                child: Text(
                  patient.time,
                  style: const TextStyle(
                    color: blue,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: patient.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patient.name,
                      style: const TextStyle(
                        color: navy,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${patient.detail} · ${patient.room}',
                      style: const TextStyle(
                        color: Color(0xFF71899B),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.more_horiz, color: Color(0xFF8AA4B5)),
            ],
          ),
        ),
      ),
    ),
  );
}

class CheckIn extends StatelessWidget {
  const CheckIn({super.key, required this.checkedIn, required this.onCheckIn});
  final int checkedIn;
  final VoidCallback onCheckIn;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const Text(
        'Check-in',
        style: TextStyle(
          fontSize: 27,
          fontWeight: FontWeight.w800,
          color: navy,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        '$checkedIn bệnh nhân đã đến hôm nay',
        style: const TextStyle(color: Color(0xFF66839A)),
      ),
      const SizedBox(height: 20),
      TextField(
        decoration: InputDecoration(
          hintText: 'Tìm tên, mã hồ sơ hoặc số điện thoại',
          prefixIcon: const Icon(Icons.search),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(17),
            borderSide: BorderSide.none,
          ),
        ),
      ),
      const SizedBox(height: 20),
      const SectionHeader('Đang chờ check-in', '4 bệnh nhân'),
      const SizedBox(height: 10),
      ...patients.map(
        (p) => Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFFDFF1F8),
              foregroundColor: blue,
              child: Text(
                p.initials,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            title: Text(
              p.name,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: Text('${p.time} · ${p.room}'),
            trailing: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: blue),
              onPressed: onCheckIn,
              child: const Text('Đến'),
            ),
          ),
        ),
      ),
    ],
  );
}

class Appointments extends StatelessWidget {
  const Appointments({super.key, required this.onProfile});
  final ValueChanged<Patient> onProfile;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const Text(
        'Lịch hẹn',
        style: TextStyle(
          fontSize: 27,
          fontWeight: FontWeight.w800,
          color: navy,
        ),
      ),
      const SizedBox(height: 4),
      const Text(
        'Thứ Ba, 20 tháng 8',
        style: TextStyle(color: Color(0xFF66839A)),
      ),
      const SizedBox(height: 18),
      Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFD9F0F7),
          borderRadius: BorderRadius.circular(17),
        ),
        child: const Row(
          children: [
            Icon(Icons.calendar_today_outlined, color: blue),
            SizedBox(width: 10),
            Text(
              'Hôm nay · 26 lịch hẹn',
              style: TextStyle(fontWeight: FontWeight.w800, color: navy),
            ),
          ],
        ),
      ),
      const SizedBox(height: 18),
      ...patients.map(
        (p) => AppointmentCard(patient: p, onTap: () => onProfile(p)),
      ),
    ],
  );
}

class PatientProfilePage extends StatelessWidget {
  const PatientProfilePage({super.key, required this.patient});
  final Patient patient;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      backgroundColor: canvas,
      title: const Text(
        'Hồ sơ bệnh nhân',
        style: TextStyle(color: navy, fontWeight: FontWeight.w800),
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFDFF1F8),
            borderRadius: BorderRadius.circular(25),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: patient.color.withValues(alpha: .25),
                foregroundColor: navy,
                child: Text(
                  patient.initials,
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 15),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    patient.name,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Mã hồ sơ · PT-02498',
                    style: TextStyle(color: Color(0xFF617E91)),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Lịch hẹn ${patient.time} · ${patient.room}',
                    style: const TextStyle(
                      color: blue,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 21),
        const SectionHeader('Thông tin hôm nay', ''),
        const SizedBox(height: 9),
        const Card(
          child: Column(
            children: [
              ListTile(
                leading: Icon(Icons.medical_services_outlined, color: blue),
                title: Text('Lý do khám'),
                subtitle: Text('Khám nội tổng quát'),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.person_outline, color: blue),
                title: Text('Bác sĩ phụ trách'),
                subtitle: Text('BS. Huy · Phòng 203'),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.note_alt_outlined, color: blue),
                title: Text('Ghi chú tiếp đón'),
                subtitle: Text('Đã xác nhận thông tin liên hệ'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: blue,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.check_circle_outline),
          label: const Text('Xác nhận đã tiếp đón'),
        ),
      ],
    ),
  );
}

class WorkSchedule extends StatelessWidget {
  const WorkSchedule({super.key});
  @override
  Widget build(BuildContext context) {
    const shifts = [
      ('Thứ Tư, 21/8', '08:00 — 17:00', 'Ca sáng · Phòng khám 01'),
      ('Thứ Năm, 22/8', '12:00 — 20:00', 'Ca chiều · Quầy tiếp đón'),
      ('Thứ Bảy, 24/8', '08:00 — 12:00', 'Ca cuối tuần · Phòng khám 02'),
    ];
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Lịch làm việc',
          style: TextStyle(
            fontSize: 27,
            fontWeight: FontWeight.w800,
            color: navy,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Tuần 19 — 25 tháng 8',
          style: TextStyle(color: Color(0xFF66839A)),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(19),
          decoration: BoxDecoration(
            color: navy,
            borderRadius: BorderRadius.circular(24),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'CA HÔM NAY',
                style: TextStyle(
                  color: Color(0xFFBDEBFA),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
              SizedBox(height: 6),
              Text(
                '08:00 — 17:00',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 27,
                  fontWeight: FontWeight.w800,
                ),
              ),
              SizedBox(height: 5),
              Text(
                'Quầy tiếp đón · Phòng khám 01',
                style: TextStyle(color: Color(0xFFB7CADB)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 21),
        const SectionHeader('Các ca trong tuần', ''),
        const SizedBox(height: 10),
        ...shifts.map(
          (s) => Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFDFF1F8),
                child: Icon(Icons.schedule, color: blue),
              ),
              title: Text(
                s.$1,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(s.$3),
              trailing: Text(
                s.$2,
                style: const TextStyle(
                  color: blue,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
