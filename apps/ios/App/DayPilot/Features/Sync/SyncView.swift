import SwiftUI
import DayPilotCore

struct SyncView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var connections: [CalendarConnectionStatus] = []
    @State private var calendars: [DeviceCalendar] = []
    @State private var selected: Set<String> = []
    @State private var error: String?
    @State private var status = "Idle"
    @State private var busy = false

    var body: some View {
        NavigationStack {
            List {
                Section("Cloud connections") {
                    if connections.isEmpty {
                        Text("None yet. Connect Google or Outlook on web — this list is Nest `GET /calendar-connections`.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(connections) { item in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(item.displayName).font(.headline)
                                Text(item.email.isEmpty ? item.status : item.email)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(item.connected ? "Connected" : item.status)
                                .font(.caption)
                                .foregroundStyle(DayPilotTheme.green)
                        }
                    }
                }

                Section("Apple Calendar (this phone)") {
                    Button(busy ? "Working…" : "Allow calendars + push to Nest") {
                        Task { await syncApple() }
                    }
                    .disabled(busy)
                    Text(status).font(.caption).foregroundStyle(.secondary)
                    ForEach(calendars) { calendar in
                        Toggle(isOn: Binding(
                            get: { selected.contains(calendar.id) },
                            set: { on in
                                if on { selected.insert(calendar.id) } else { selected.remove(calendar.id) }
                            }
                        )) {
                            Text(calendar.title)
                        }
                    }
                }
            }
            .navigationTitle("Sync")
            .task { await loadConnections() }
            .refreshable { await loadConnections() }
        }
    }

    private func loadConnections() async {
        do {
            connections = try await container.loadSync()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func syncApple() async {
        busy = true
        defer { busy = false }
        do {
            let granted = try await container.eventKit.requestAccess()
            guard granted else { throw DayPilotError.eventKitDenied }
            calendars = try await container.eventKit.calendars()
            if selected.isEmpty {
                selected = Set(calendars.filter(\.isSelected).map(\.id))
            }
            try await container.syncEventKit(selectedCalendarIds: Array(selected))
            status = "Pushed EventKit to Nest. Web can show the Apple cloud copy."
            await loadConnections()
        } catch {
            status = error.localizedDescription
        }
    }
}
