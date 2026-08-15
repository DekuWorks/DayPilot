import SwiftUI
import DayPilotCore

enum CalendarSpan: String, CaseIterable, Identifiable {
    case day, week, month
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

struct CalendarHomeView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var span: CalendarSpan = .month
    @State private var cursor = Date()
    @State private var events: [CalendarEvent] = []
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("View", selection: $span) {
                    ForEach(CalendarSpan.allCases) { item in
                        Text(item.title).tag(item)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                List(visibleEvents) { event in
                    EventRow(event: event)
                }
                .scrollContentBackground(.hidden)
            }
            .background(DayPilotTheme.background)
            .navigationTitle("Calendar")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Today") { cursor = Date() }
                }
            }
            .task(id: rangeKey) { await load() }
            .refreshable { await load() }
            .overlay {
                if let error {
                    Text(error).foregroundStyle(.red).padding()
                }
            }
        }
    }

    private var visibleEvents: [CalendarEvent] {
        events.filter { $0.startsAt >= range.start && $0.startsAt < range.end }
    }

    private var range: (start: Date, end: Date) {
        let cal = Calendar.current
        switch span {
        case .day:
            let start = cal.startOfDay(for: cursor)
            let end = cal.date(byAdding: .day, value: 1, to: start) ?? start
            return (start, end)
        case .week:
            let start = cal.dateInterval(of: .weekOfYear, for: cursor)?.start ?? cal.startOfDay(for: cursor)
            let end = cal.date(byAdding: .day, value: 7, to: start) ?? start
            return (start, end)
        case .month:
            let start = cal.dateInterval(of: .month, for: cursor)?.start ?? cal.startOfDay(for: cursor)
            let end = cal.date(byAdding: .month, value: 1, to: start) ?? start
            return (start, end)
        }
    }

    private var rangeKey: String {
        "\(span.rawValue)-\(range.start.timeIntervalSince1970)"
    }

    private func load() async {
        do {
            events = try await container.loadEvents(from: range.start, to: range.end)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}
