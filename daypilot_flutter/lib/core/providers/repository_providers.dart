import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/attendee_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/booking_repository.dart';
import '../../data/repositories/event_repository.dart';
import '../../data/repositories/insights_repository.dart';
import '../../data/repositories/local_cache_repository.dart';
import '../../domain/models/event_record.dart';
import 'bootstrap_providers.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});

final eventRepositoryProvider = Provider<EventRepository>((ref) {
  return EventRepository(ref.watch(supabaseClientProvider));
});

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepository(ref.watch(supabaseClientProvider));
});

final attendeeRepositoryProvider = Provider<AttendeeRepository>((ref) {
  return AttendeeRepository(ref.watch(supabaseClientProvider));
});

final insightsRepositoryProvider = Provider<InsightsRepository>((ref) {
  return InsightsRepository(ref.watch(supabaseClientProvider));
});

final localCacheRepositoryProvider = Provider<LocalCacheRepository>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return LocalCacheRepository(prefs);
});

final eventDetailProvider =
    FutureProvider.autoDispose.family<EventRecord?, String>((ref, id) {
  return ref.watch(eventRepositoryProvider).getById(id);
});
