import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase Realtime on `public.events` — enable replication in the dashboard or run
/// `tooling/supabase_realtime_events.sql` in the SQL editor.
class RealtimeService {
  RealtimeService(this._client);

  final SupabaseClient _client;

  RealtimeChannel subscribeToEvents(void Function(PostgresChangePayload payload) onData) {
    final channel = _client.channel('daypilot-events-${DateTime.now().microsecondsSinceEpoch}');
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'events',
      callback: onData,
    );
    channel.subscribe();
    return channel;
  }
}
