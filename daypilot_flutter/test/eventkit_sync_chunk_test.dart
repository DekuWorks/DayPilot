import 'package:daypilot_flutter/data/repositories/calendar_connections_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('empty events still produce one calendars-only chunk', () {
    expect(chunkEventKitEvents<int>([]), [[]]);
  });

  test('splits large EventKit uploads into 250-event chunks', () {
    final events = List<int>.generate(501, (i) => i);
    final chunks = chunkEventKitEvents(events);
    expect(chunks.length, 3);
    expect(chunks[0].length, eventKitSyncChunkSize);
    expect(chunks[1].length, eventKitSyncChunkSize);
    expect(chunks[2], [500]);
  });
}
