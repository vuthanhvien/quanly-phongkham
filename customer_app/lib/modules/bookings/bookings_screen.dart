import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_icons.dart';
import '../../routes/app_routes.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_view.dart';
import 'booking_card.dart';
import 'bookings_controller.dart';

class BookingsScreen extends StatelessWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<BookingsController>();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Lịch hẹn của tôi'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Sắp tới'),
              Tab(text: 'Lịch sử'),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => Get.toNamed(AppRoutes.bookingCreate),
          child: const Icon(AppIcons.plus),
        ),
        body: RefreshIndicator(
          onRefresh: controller.load,
          child: Obx(() {
            if (controller.isLoading.value && controller.appointments.isEmpty) {
              return const LoadingView();
            }
            if (controller.errorMessage.value != null &&
                controller.appointments.isEmpty) {
              return _LoadError(
                message: controller.errorMessage.value!,
                onRetry: controller.load,
              );
            }
            return TabBarView(
              children: [
                _BookingList(
                  items: controller.upcoming,
                  emptyMessage: 'Bạn chưa có lịch hẹn sắp tới',
                ),
                _BookingList(
                  items: controller.history,
                  emptyMessage: 'Chưa có lịch sử lịch hẹn',
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    physics: const AlwaysScrollableScrollPhysics(),
    child: SizedBox(
      height: 400,
      child: EmptyState(
        icon: AppIcons.empty,
        message: message,
        actionLabel: 'Thử lại',
        onAction: onRetry,
      ),
    ),
  );
}

class _BookingList extends StatelessWidget {
  const _BookingList({required this.items, required this.emptyMessage});

  final List items;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: 400,
          child: EmptyState(icon: AppIcons.empty, message: emptyMessage),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final appointment = items[index];
        return BookingCard(
          appointment: appointment,
          onTap: () =>
              Get.toNamed(AppRoutes.bookingDetail, arguments: appointment.id),
        );
      },
    );
  }
}
