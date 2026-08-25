import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:video_player/video_player.dart';

import '../../core/theme/app_colors.dart';
import '../../data/demo/clinic_content.dart';
import '../home/home_controller.dart';

/// Full-screen, vertical short-video feed. Only CMS `content_videos` are shown
/// here; posts and news remain on Home and their own list pages.
class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  var _activeIndex = 0;

  @override
  Widget build(BuildContext context) {
    final home = Get.find<HomeController>();
    return Scaffold(
      backgroundColor: Colors.black,
      body: Obx(() {
        final videos = home.videos;
        if (videos.isEmpty) {
          return RefreshIndicator(
            onRefresh: home.load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 300),
                Center(
                  child: Text(
                    'Chưa có video ngắn',
                    style: TextStyle(color: Colors.white70),
                  ),
                ),
              ],
            ),
          );
        }
        return Stack(
          children: [
            PageView.builder(
              scrollDirection: Axis.vertical,
              itemCount: videos.length,
              onPageChanged: (index) => setState(() => _activeIndex = index),
              itemBuilder: (_, index) => ShortVideoPage(
                key: ValueKey(videos[index].id),
                video: videos[index],
                isActive: index == _activeIndex,
              ),
            ),
            const SafeArea(
              child: Align(
                alignment: Alignment.topCenter,
                child: Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Video ngắn',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}

class ShortVideoPage extends StatefulWidget {
  const ShortVideoPage({
    super.key,
    required this.video,
    required this.isActive,
  });

  final ClinicVideo video;
  final bool isActive;

  @override
  State<ShortVideoPage> createState() => _ShortVideoPageState();
}

class _ShortVideoPageState extends State<ShortVideoPage>
    with AutomaticKeepAliveClientMixin {
  VideoPlayerController? _controller;
  var _failedToLoad = false;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadVideo();
  }

  @override
  void didUpdateWidget(covariant ShortVideoPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.video.videoUrl != widget.video.videoUrl) {
      _controller?.dispose();
      _controller = null;
      _failedToLoad = false;
      _loadVideo();
      return;
    }
    _syncPlayback();
  }

  Future<void> _loadVideo() async {
    final url = widget.video.videoUrl.trim();
    if (url.isEmpty) {
      if (mounted) setState(() => _failedToLoad = true);
      return;
    }
    try {
      final controller = VideoPlayerController.networkUrl(Uri.parse(url));
      await controller.initialize();
      await controller.setLooping(true);
      if (!mounted) {
        controller.dispose();
        return;
      }
      setState(() => _controller = controller);
      _syncPlayback();
    } catch (_) {
      if (mounted) setState(() => _failedToLoad = true);
    }
  }

  void _syncPlayback() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (widget.isActive) {
      controller.play();
    } else {
      controller.pause();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final controller = _controller;
    return GestureDetector(
      onTap: () {
        if (controller == null || !controller.value.isInitialized) return;
        controller.value.isPlaying ? controller.pause() : controller.play();
        setState(() {});
      },
      child: Stack(
        fit: StackFit.expand,
        children: [
          _VideoBackground(
            controller: controller,
            thumbnailUrl: widget.video.imageUrl,
            failedToLoad: _failedToLoad,
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.center,
                end: Alignment.bottomCenter,
                colors: [Color(0x00000000), Color(0xB8000000)],
              ),
            ),
          ),
          if (controller?.value.isInitialized == true &&
              !controller!.value.isPlaying)
            const Center(
              child: CircleAvatar(
                radius: 30,
                backgroundColor: Colors.black45,
                child: Icon(
                  Icons.play_arrow_rounded,
                  color: Colors.white,
                  size: 38,
                ),
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.video.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (widget.video.excerpt.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        widget.video.excerpt,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xE6FFFFFF),
                          height: 1.35,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoBackground extends StatelessWidget {
  const _VideoBackground({
    required this.controller,
    required this.thumbnailUrl,
    required this.failedToLoad,
  });

  final VideoPlayerController? controller;
  final String thumbnailUrl;
  final bool failedToLoad;

  @override
  Widget build(BuildContext context) {
    if (controller?.value.isInitialized == true) {
      final size = controller!.value.size;
      return FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: size.width,
          height: size.height,
          child: VideoPlayer(controller!),
        ),
      );
    }
    if (thumbnailUrl.isNotEmpty) {
      return Image.network(
        thumbnailUrl,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const ColoredBox(color: AppColors.title),
      );
    }
    return ColoredBox(
      color: AppColors.title,
      child: Center(
        child: Icon(
          failedToLoad
              ? Icons.videocam_off_outlined
              : Icons.play_circle_outline,
          color: Colors.white70,
          size: 44,
        ),
      ),
    );
  }
}
