import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight key/value cache for offline-friendly startup (task 25).
class LocalCacheRepository {
  LocalCacheRepository(this._prefs);

  final SharedPreferences _prefs;

  static const _kLastSyncKey = 'daypilot_last_sync_iso';

  DateTime? get lastSyncAt {
    final raw = _prefs.getString(_kLastSyncKey);
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }

  Future<void> setLastSyncAt(DateTime time) async {
    await _prefs.setString(_kLastSyncKey, time.toIso8601String());
  }
}
