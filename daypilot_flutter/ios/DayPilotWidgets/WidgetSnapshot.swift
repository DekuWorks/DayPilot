import Foundation
import SwiftUI
import WidgetKit

struct WidgetEvent: Codable, Identifiable {
    var id: String
    var title: String
    var startsAt: Date
    var endsAt: Date
    var location: String?
    var color: String?

    var durationLabel: String {
        let minutes = max(Int(endsAt.timeIntervalSince(startsAt) / 60), 0)
        if minutes >= 60 {
            let hours = minutes / 60
            let rem = minutes % 60
            return rem == 0 ? "\(hours)h" : "\(hours)h \(rem)m"
        }
        return "\(minutes)m"
    }

    var timeLabel: String {
        startsAt.formatted(date: .omitted, time: .shortened)
    }

    var rangeLabel: String {
        "\(timeLabel)–\(endsAt.formatted(date: .omitted, time: .shortened))"
    }

    func tint(index: Int) -> Color {
        WidgetTheme.color(hex: color, index: index)
    }
}

struct WidgetTask: Codable, Identifiable {
    var id: String
    var title: String
    var done: Bool
    var color: String?

    func tint(index: Int) -> Color {
        WidgetTheme.color(hex: color, index: index)
    }
}

struct WidgetSnapshot: Codable {
    var displayName: String
    var updatedAt: Date
    var focusMinutes: Int
    var events: [WidgetEvent]
    var tasks: [WidgetTask]
    var tasksDone: Int
    var tasksTotal: Int

    var firstName: String {
        Self.greetingFirstName(from: displayName)
    }

    /// Greeting token only. Reject emails / empty values — never `dekuworks1@…`.
    static func greetingFirstName(from displayName: String) -> String {
        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed.contains("@") { return "there" }
        let token = trimmed.split(whereSeparator: { $0.isWhitespace }).first.map(String.init) ?? trimmed
        if token.isEmpty || token.contains("@") { return "there" }
        return token
    }

    var focusLabel: String {
        let hours = focusMinutes / 60
        let minutes = focusMinutes % 60
        if hours == 0 { return "\(minutes)m focus available" }
        if minutes == 0 { return "\(hours)h focus available" }
        return "\(hours)h \(minutes)m focus available"
    }

    var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning, \(firstName)" }
        if hour < 17 { return "Good afternoon, \(firstName)" }
        return "Good evening, \(firstName)"
    }

    var upcoming: [WidgetEvent] {
        let now = Date()
        return events
            .filter { $0.endsAt >= now }
            .sorted { $0.startsAt < $1.startsAt }
    }

    var openTasks: [WidgetTask] {
        tasks.filter { !$0.done }
    }

    static let appGroup = "group.com.dekuworks.daypilot"
    static let defaultsKey = "widget.snapshot.json"

    static func load() -> WidgetSnapshot {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let json = defaults.string(forKey: defaultsKey),
            let data = json.data(using: .utf8)
        else { return .placeholder }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode(WidgetSnapshot.self, from: data)) ?? .placeholder
    }

    static let placeholder = WidgetSnapshot(
        displayName: "Marcus",
        updatedAt: Date(),
        focusMinutes: 270,
        events: [
            WidgetEvent(
                id: "1",
                title: "Team Standup",
                startsAt: Calendar.current.date(bySettingHour: 10, minute: 0, second: 0, of: Date()) ?? Date(),
                endsAt: Calendar.current.date(bySettingHour: 10, minute: 30, second: 0, of: Date()) ?? Date(),
                location: "Microsoft Teams",
                color: "#3B82F6"
            ),
            WidgetEvent(
                id: "2",
                title: "Lunch with Marcus",
                startsAt: Calendar.current.date(bySettingHour: 12, minute: 30, second: 0, of: Date()) ?? Date(),
                endsAt: Calendar.current.date(bySettingHour: 13, minute: 30, second: 0, of: Date()) ?? Date(),
                location: "Main Street Cafe",
                color: "#39FF14"
            ),
            WidgetEvent(
                id: "3",
                title: "DayPilot Focus Time",
                startsAt: Calendar.current.date(bySettingHour: 14, minute: 0, second: 0, of: Date()) ?? Date(),
                endsAt: Calendar.current.date(bySettingHour: 16, minute: 0, second: 0, of: Date()) ?? Date(),
                location: "Deep Work",
                color: "#A855F7"
            ),
            WidgetEvent(
                id: "4",
                title: "Client Call",
                startsAt: Calendar.current.date(bySettingHour: 16, minute: 30, second: 0, of: Date()) ?? Date(),
                endsAt: Calendar.current.date(bySettingHour: 17, minute: 15, second: 0, of: Date()) ?? Date(),
                location: nil,
                color: "#F5A524"
            ),
        ],
        tasks: [
            WidgetTask(id: "t1", title: "DayPilot iOS build", done: false, color: "#A855F7"),
            WidgetTask(id: "t2", title: "Test calendar sync", done: false, color: "#3B82F6"),
            WidgetTask(id: "t3", title: "Review PR #142", done: false, color: "#39FF14"),
        ],
        tasksDone: 3,
        tasksTotal: 6
    )
}

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}
