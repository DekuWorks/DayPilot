import SwiftUI
import DayPilotCore

struct TodayView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var events: [CalendarEvent] = []
    @State private var profile: UserProfile?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                if let profile {
                    HStack(spacing: 12) {
                        AvatarView(url: profile.avatarURL, name: profile.displayName ?? profile.email)
                        VStack(alignment: .leading) {
                            Text(profile.displayName ?? profile.email ?? "Signed in")
                                .font(.headline)
                            Text("Today")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .listRowBackground(DayPilotTheme.card)
                }
                if events.isEmpty {
                    Text("No Nest events in the next 24 hours.")
                        .foregroundStyle(.secondary)
                }
                ForEach(events) { event in
                    EventRow(event: event)
                }
            }
            .navigationTitle("Today")
            .scrollContentBackground(.hidden)
            .background(DayPilotTheme.background)
            .refreshable { await load() }
            .task { await load() }
            .overlay {
                if let error {
                    Text(error).foregroundStyle(.red).padding()
                }
            }
        }
    }

    private func load() async {
        do {
            profile = try await container.loadProfile()
            let start = Date()
            let end = Calendar.current.date(byAdding: .hour, value: 24, to: start) ?? start
            events = try await container.loadEvents(from: start, to: end)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct EventRow: View {
    let event: CalendarEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(event.title).font(.headline)
            Text(event.startsAt.formatted(date: .omitted, time: .shortened))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let location = event.location, !location.isEmpty {
                Text(location).font(.caption).foregroundStyle(.secondary)
            }
        }
        .listRowBackground(DayPilotTheme.card)
    }
}
