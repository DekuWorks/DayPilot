import SwiftUI
import WidgetKit

@main
struct DayPilotWidgetsBundle: WidgetBundle {
    var body: some Widget {
        DayPilotDayWidget()
        DayPilotTasksWidget()
        DayPilotUpNextWidget()
        DayPilotCalendarWidget()
    }
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let entry = SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load())
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct DayPilotDayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DayPilotDay", provider: SnapshotProvider()) { entry in
            DayPilotDayView(entry: entry)
                .containerBackground(WidgetTheme.charcoal, for: .widget)
        }
        .configurationDisplayName("DayPilot")
        .description("Today’s timeline, greeting, and focus time.")
        .supportedFamilies([.accessoryRectangular, .systemMedium, .systemLarge])
    }
}

struct DayPilotTasksWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DayPilotTasks", provider: SnapshotProvider()) { entry in
            TasksWidgetView(entry: entry)
                .containerBackground(WidgetTheme.charcoal, for: .widget)
        }
        .configurationDisplayName("Tasks Today")
        .description("How many tasks you’ve finished today.")
        .supportedFamilies([.accessoryRectangular, .systemSmall])
    }
}

struct DayPilotUpNextWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DayPilotUpNext", provider: SnapshotProvider()) { entry in
            UpNextSmallView(entry: entry)
                .containerBackground(WidgetTheme.charcoal, for: .widget)
        }
        .configurationDisplayName("Up Next")
        .description("The next two events on your day.")
        .supportedFamilies([.systemSmall])
    }
}

struct DayPilotCalendarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DayPilotCalendar", provider: SnapshotProvider()) { entry in
            MiniCalendarView(entry: entry)
                .containerBackground(WidgetTheme.charcoal, for: .widget)
        }
        .configurationDisplayName("Today")
        .description("A compact calendar for this day, with what’s next.")
        .supportedFamilies([.systemSmall])
    }
}

struct DayPilotDayView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            LockTimelineView(snapshot: entry.snapshot)
        case .systemLarge:
            StandByView(snapshot: entry.snapshot)
        default:
            HomeMediumView(snapshot: entry.snapshot)
        }
    }
}

struct LockTimelineView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("DAYPILOT")
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(0.8)
                Spacer()
                Text("UP NEXT")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(WidgetTheme.blue)
                    .tracking(0.6)
            }
            ForEach(Array(snapshot.upcoming.prefix(3).enumerated()), id: \.element.id) { index, event in
                HStack(alignment: .top, spacing: 6) {
                    Circle()
                        .fill(event.tint(index: index))
                        .frame(width: 5, height: 5)
                        .padding(.top, 3)
                    VStack(alignment: .leading, spacing: 0) {
                        Text("\(event.timeLabel)  \(event.title)")
                            .font(.system(size: 12, weight: .semibold))
                            .lineLimit(1)
                        Text("\(event.durationLabel) · \(event.location ?? "DayPilot")")
                            .font(.system(size: 10))
                            .foregroundStyle(WidgetTheme.secondary)
                            .lineLimit(1)
                    }
                }
            }
            HStack(spacing: 4) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(WidgetTheme.blue)
                Text(snapshot.focusLabel)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(WidgetTheme.blue)
                    .lineLimit(1)
            }
        }
    }
}

struct HomeMediumView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("DAYPILOT")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1)
                    .foregroundStyle(.white.opacity(0.7))
                Spacer()
                Text(Date.now.formatted(.dateTime.weekday(.abbreviated).day()).uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(WidgetTheme.blue)
            }
            Text(snapshot.greeting)
                .font(.system(size: 18, weight: .bold))
                .lineLimit(1)
            Text("Here's your day")
                .font(.system(size: 12))
                .foregroundStyle(WidgetTheme.secondary)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(snapshot.upcoming.prefix(4).enumerated()), id: \.element.id) { index, event in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(event.tint(index: index))
                            .frame(width: 6, height: 6)
                        Text(event.timeLabel)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(WidgetTheme.secondary)
                            .frame(width: 62, alignment: .leading)
                        Text(event.title)
                            .font(.system(size: 14, weight: .semibold))
                            .lineLimit(1)
                    }
                }
            }
            Spacer(minLength: 0)
            HStack(spacing: 4) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(WidgetTheme.blue)
                Text(snapshot.focusLabel)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(WidgetTheme.blue)
            }
        }
        .padding(2)
    }
}

struct StandByView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            MiniCalendarPane(events: snapshot.events)
                .frame(maxWidth: 150)
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("DAYPILOT")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1)
                        .foregroundStyle(.white.opacity(0.7))
                    Spacer()
                    Text("UP NEXT")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(WidgetTheme.blue)
                }
                ForEach(Array(snapshot.upcoming.prefix(3).enumerated()), id: \.element.id) { index, event in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(event.tint(index: index))
                            .frame(width: 7, height: 7)
                            .padding(.top, 4)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("\(event.timeLabel)  \(event.title)")
                                .font(.system(size: 16, weight: .semibold))
                                .lineLimit(1)
                            Text("\(event.durationLabel) · \(event.location ?? "DayPilot")")
                                .font(.system(size: 12))
                                .foregroundStyle(WidgetTheme.secondary)
                                .lineLimit(1)
                        }
                    }
                }
                Spacer(minLength: 0)
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                        .foregroundStyle(WidgetTheme.blue)
                    Text(snapshot.focusLabel)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(WidgetTheme.blue)
                }
            }
        }
        .padding(4)
    }
}

struct TasksWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        if family == .accessoryRectangular {
            LockTasksView(snapshot: entry.snapshot)
        } else {
            SmallTasksView(snapshot: entry.snapshot)
        }
    }
}

struct LockTasksView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(WidgetTheme.green)
                Text("\(snapshot.tasksDone) / \(snapshot.tasksTotal) Tasks Today")
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
            }
            VStack(alignment: .leading, spacing: 2) {
                ForEach(Array(snapshot.openTasks.prefix(3).enumerated()), id: \.element.id) { index, task in
                    HStack(spacing: 5) {
                        Circle()
                            .fill(task.tint(index: index))
                            .frame(width: 5, height: 5)
                        Text(task.title)
                            .font(.system(size: 11, weight: .medium))
                            .lineLimit(1)
                    }
                }
            }
        }
    }
}

struct SmallTasksView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Spacer()
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white.opacity(0.7))
            }
            Spacer(minLength: 0)
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(WidgetTheme.green)
            Text("\(snapshot.tasksDone) / \(snapshot.tasksTotal)")
                .font(.system(size: 23, weight: .bold))
            Text("Tasks Today")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(WidgetTheme.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(2)
        .widgetURL(URL(string: "com.daypilot.daypilot://tasks"))
    }
}

struct UpNextSmallView: View {
    let entry: SnapshotEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("UP NEXT")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(WidgetTheme.blue)
                .tracking(0.8)
            ForEach(Array(entry.snapshot.upcoming.prefix(2).enumerated()), id: \.element.id) { index, event in
                HStack(alignment: .top, spacing: 8) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(event.tint(index: index))
                        .frame(width: 3, height: 32)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(event.title)
                            .font(.system(size: 13, weight: .semibold))
                            .lineLimit(1)
                        Text(event.rangeLabel)
                            .font(.system(size: 11))
                            .foregroundStyle(WidgetTheme.secondary)
                            .lineLimit(1)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(2)
    }
}

struct MiniCalendarView: View {
    let entry: SnapshotEntry

    var body: some View {
        let now = Date()
        let weekday = now.formatted(.dateTime.weekday(.abbreviated)).uppercased()
        let day = Calendar.current.component(.day, from: now)
        let month = now.formatted(.dateTime.month(.abbreviated)).uppercased()
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("DAYPILOT")
                    .font(.system(size: 8, weight: .semibold))
                    .tracking(0.7)
                    .foregroundStyle(.white.opacity(0.55))
                Spacer()
                Text(month)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(WidgetTheme.blue)
            }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(weekday)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(WidgetTheme.blue)
                Text("\(day)")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }
            WeekStrip(events: entry.snapshot.events)
            if let next = entry.snapshot.upcoming.first {
                HStack(spacing: 6) {
                    Capsule()
                        .fill(next.tint(index: 0))
                        .frame(width: 3, height: 14)
                    Text(next.title)
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                }
            } else {
                Text("Clear day")
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetTheme.secondary)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(2)
    }
}

struct MiniCalendarPane: View {
    let events: [WidgetEvent]

    var body: some View {
        let now = Date()
        VStack(alignment: .leading, spacing: 8) {
            Text(now.formatted(date: .omitted, time: .shortened))
                .font(.system(size: 36, weight: .bold, design: .rounded))
            Text(now.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(WidgetTheme.secondary)
            WeekStrip(events: events)
            MonthDots(events: events)
        }
    }
}

struct WeekStrip: View {
    let events: [WidgetEvent]

    var body: some View {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let weekday = cal.component(.weekday, from: today)
        let start = cal.date(byAdding: .day, value: 1 - weekday, to: today) ?? today
        HStack(spacing: 3) {
            ForEach(0..<7, id: \.self) { offset in
                let day = cal.date(byAdding: .day, value: offset, to: start) ?? today
                let isToday = cal.isDate(day, inSameDayAs: today)
                let hasEvent = events.contains { cal.isDate($0.startsAt, inSameDayAs: day) }
                VStack(spacing: 2) {
                    Text(day.formatted(.dateTime.weekday(.narrow)))
                        .font(.system(size: 8, weight: .semibold))
                        .foregroundStyle(isToday ? WidgetTheme.green : WidgetTheme.muted)
                    Text("\(cal.component(.day, from: day))")
                        .font(.system(size: 10, weight: .bold))
                        .frame(width: 16, height: 16)
                        .background(isToday ? WidgetTheme.green : Color.clear)
                        .foregroundStyle(isToday ? WidgetTheme.charcoal : .white)
                        .clipShape(Circle())
                    Circle()
                        .fill(hasEvent && !isToday ? WidgetTheme.blue : Color.clear)
                        .frame(width: 3, height: 3)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

struct MonthDots: View {
    let events: [WidgetEvent]

    var body: some View {
        let cal = Calendar.current
        let today = Date()
        let start = cal.date(from: cal.dateComponents([.year, .month], from: today)) ?? today
        let days = cal.range(of: .day, in: .month, for: today)?.count ?? 30
        let pad = cal.component(.weekday, from: start) - 1
        let cells = Array(repeating: 0, count: pad) + Array(1...days)
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 2) {
            ForEach(Array(cells.enumerated()), id: \.offset) { _, value in
                if value == 0 {
                    Color.clear.frame(height: 10)
                } else {
                    let day = cal.date(byAdding: .day, value: value - 1, to: start) ?? today
                    let isToday = cal.isDate(day, inSameDayAs: today)
                    Circle()
                        .fill(isToday ? WidgetTheme.green : Color.white.opacity(0.08))
                        .frame(width: 10, height: 10)
                        .overlay {
                            if events.contains(where: { cal.isDate($0.startsAt, inSameDayAs: day) }) && !isToday {
                                Circle().fill(WidgetTheme.blue).frame(width: 3, height: 3)
                            }
                        }
                }
            }
        }
    }
}
