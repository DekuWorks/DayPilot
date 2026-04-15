import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/repository_providers.dart';

final latestInsightProvider = FutureProvider.autoDispose((ref) {
  return ref.watch(insightsRepositoryProvider).getLatest();
});
