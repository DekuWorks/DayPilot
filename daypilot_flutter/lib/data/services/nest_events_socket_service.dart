import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/daypilot_env.dart';

/// Socket.IO client for Nest [EventsGateway] (`/ws`, events `event:*`).
class NestEventsSocketService {
  NestEventsSocketService({
    required this.accessToken,
    required this.onCalendarSync,
  });

  final String accessToken;
  final void Function() onCalendarSync;

  io.Socket? _socket;

  void connect() {
    disconnect();
    final baseUrl =
        DayPilotEnv.daypilotApiUrl.replaceAll(RegExp(r'/$'), '');

    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setPath('/ws')
          .setAuth({'token': accessToken})
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .build(),
    );

    void sync(_) => onCalendarSync();

    _socket!
      ..on('event:created', sync)
      ..on('event:updated', sync)
      ..on('event:deleted', sync)
      ..on('calendar:synced', sync);
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
