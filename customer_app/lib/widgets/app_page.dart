import 'package:flutter/material.dart';

/// Shared shell for customer-app pages: consistent header and optional
/// pull-to-refresh. The body should be a scrollable widget when refreshing.
class AppPage extends StatelessWidget {
  const AppPage({
    super.key,
    required this.body,
    this.title,
    this.centerTitle = false,
    this.onRefresh,
    this.floatingActionButton,
    this.bottomNavigationBar,
  });

  final Widget body;
  final String? title;
  final bool centerTitle;
  final Future<void> Function()? onRefresh;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: title == null
        ? null
        : AppBar(title: Text(title!), centerTitle: centerTitle),
    body: onRefresh == null
        ? body
        : RefreshIndicator(onRefresh: onRefresh!, child: body),
    floatingActionButton: floatingActionButton,
    bottomNavigationBar: bottomNavigationBar,
  );
}
