import Foundation

/// Matches Flutter `eventKitSyncChunkSize` and Nest `EventKitSyncDto`.
public enum EventKitPayloadMapper {
    public static let chunkSize = 250

    public static func calendarJSON(_ calendar: DeviceCalendar) -> [String: Any] {
        var json: [String: Any] = [
            "externalCalendarId": calendar.id,
            "title": calendar.title.isEmpty ? "Calendar" : calendar.title,
            "isPrimary": calendar.isPrimary,
            "isReadOnly": calendar.isReadOnly,
            "isSelected": calendar.isSelected,
            "isVisible": calendar.isSelected,
        ]
        if let type = calendar.calendarType { json["calendarType"] = type }
        if let source = calendar.sourceName { json["sourceName"] = source }
        if let color = calendar.color { json["color"] = color }
        return json
    }

    public static func eventJSON(_ event: DeviceEvent) -> [String: Any] {
        let title = event.title.trimmingCharacters(in: .whitespacesAndNewlines)
        var json: [String: Any] = [
            "externalEventId": event.id,
            "externalCalendarId": event.calendarId,
            "title": title.isEmpty ? "(No title)" : title,
            "startsAt": ISO8601.string(from: event.startsAt),
            "endsAt": ISO8601.string(from: event.endsAt),
            "allDay": event.allDay,
        ]
        if let description = event.description, !description.isEmpty {
            json["description"] = description
        }
        if let location = event.location, !location.isEmpty {
            json["location"] = location
        }
        return json
    }

    public static func chunks<T>(_ items: [T], size: Int = chunkSize) -> [[T]] {
        guard !items.isEmpty else { return [[]] }
        var out: [[T]] = []
        var index = 0
        while index < items.count {
            let end = min(index + size, items.count)
            out.append(Array(items[index..<end]))
            index = end
        }
        return out
    }

    public static func syncBodies(
        deviceId: String,
        deviceLabel: String,
        calendars: [DeviceCalendar],
        events: [DeviceEvent],
        rangeStart: Date,
        rangeEnd: Date,
        syncStartedAt: Date = Date()
    ) -> [[String: Any]] {
        let started = ISO8601.string(from: syncStartedAt)
        let calendarPayload = calendars.map(calendarJSON)
        let eventChunks = chunks(events)
        return eventChunks.enumerated().map { index, chunk in
            [
                "deviceId": deviceId,
                "deviceLabel": deviceLabel,
                "calendars": calendarPayload,
                "events": chunk.map(eventJSON),
                "reconcileDeletes": index == eventChunks.count - 1,
                "rangeStart": ISO8601.string(from: rangeStart),
                "rangeEnd": ISO8601.string(from: rangeEnd),
                "syncStartedAt": started,
            ]
        }
    }
}

enum ISO8601 {
    static let formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let fallback: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func string(from date: Date) -> String {
        formatter.string(from: date)
    }

    static func date(from raw: String) -> Date? {
        formatter.date(from: raw) ?? fallback.date(from: raw)
    }
}
