/// Summary metrics for insights / daily brief surfaces.
class InsightSnapshot {
  const InsightSnapshot({
    required this.id,
    required this.userId,
    required this.capturedAt,
    this.headline,
    this.metrics = const {},
  });

  final String id;
  final String userId;
  final DateTime capturedAt;
  final String? headline;
  final Map<String, num> metrics;
}
