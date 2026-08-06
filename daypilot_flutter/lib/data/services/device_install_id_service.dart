import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

/// Stable per-install identifier for EventKit mappings (not an advertising ID).
class DeviceInstallIdService {
  DeviceInstallIdService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'daypilot_install_device_id';
  final FlutterSecureStorage _storage;
  String? _cached;

  Future<String> getDeviceId() async {
    if (_cached != null) return _cached!;
    final existing = await _storage.read(key: _key);
    if (existing != null && existing.isNotEmpty) {
      _cached = existing;
      return existing;
    }
    final id = const Uuid().v4();
    await _storage.write(key: _key, value: id);
    _cached = id;
    return id;
  }
}
