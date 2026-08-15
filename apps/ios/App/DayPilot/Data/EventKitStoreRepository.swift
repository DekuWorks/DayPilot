import EventKit
import Foundation
import DayPilotCore

/// Native EventKit only. Views never import EventKit.
final class EventKitStoreRepository: EventKitAccessing, @unchecked Sendable {
    private let store = EKEventStore()
    private let defaults = UserDefaults.standard
    private let deviceKey = "daypilot.eventkit.deviceId"

    func requestAccess() async throws -> Bool {
        if #available(iOS 17.0, *) {
            return try await store.requestFullAccessToEvents()
        }
        return try await store.requestAccess(to: .event)
    }

    func calendars() async throws -> [DeviceCalendar] {
        store.calendars(for: .event).map { calendar in
            DeviceCalendar(
                id: calendar.calendarIdentifier,
                title: calendar.title,
                calendarType: sourceType(calendar),
                sourceName: calendar.source.title,
                color: hex(from: calendar.cgColor),
                isPrimary: calendar == store.defaultCalendarForNewEvents,
                isReadOnly: !calendar.allowsContentModifications,
                isSelected: true
            )
        }
    }

    func events(calendarIds: [String], from: Date, to: Date) async throws -> [DeviceEvent] {
        let wanted = Set(calendarIds)
        let ekCalendars = store.calendars(for: .event).filter { wanted.contains($0.calendarIdentifier) }
        guard !ekCalendars.isEmpty else { return [] }
        let predicate = store.predicateForEvents(withStart: from, end: to, calendars: ekCalendars)
        return store.events(matching: predicate).map { event in
            DeviceEvent(
                id: event.eventIdentifier ?? UUID().uuidString,
                calendarId: event.calendar.calendarIdentifier,
                title: event.title ?? "",
                startsAt: event.startDate,
                endsAt: event.endDate,
                description: event.notes,
                location: event.location,
                allDay: event.isAllDay
            )
        }
    }

    func deviceId() async -> String {
        if let existing = defaults.string(forKey: deviceKey), !existing.isEmpty {
            return existing
        }
        let id = UUID().uuidString
        defaults.set(id, forKey: deviceKey)
        return id
    }

    func deviceLabel() -> String {
        "iPhone"
    }

    private func sourceType(_ calendar: EKCalendar) -> String {
        switch calendar.source.sourceType {
        case .local: return "local"
        case .calDAV: return "caldav"
        case .exchange: return "exchange"
        case .birthdays: return "birthdays"
        default: return "unknown"
        }
    }

    private func hex(from color: CGColor) -> String? {
        guard let comps = color.components, comps.count >= 3 else { return nil }
        let r = Int((comps[0] * 255).rounded())
        let g = Int((comps[1] * 255).rounded())
        let b = Int((comps[2] * 255).rounded())
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}
