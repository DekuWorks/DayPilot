import SwiftUI
import DayPilotCore

struct PilotBriefView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var brief: PilotBrief?
    @State private var error: String?
    @State private var loaded = false

    var body: some View {
        NavigationStack {
            Group {
                if let brief {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text(brief.summary)
                                .font(.title3)
                            metric("Events today", brief.eventsToday)
                            metric("Tasks due", brief.tasksDue)
                            metric("Overdue", brief.tasksOverdue)
                            if !brief.suggestions.isEmpty {
                                section("Suggestions", brief.suggestions)
                            }
                            if !brief.conflicts.isEmpty {
                                section("Conflicts", brief.conflicts)
                            }
                            if !brief.focusWindows.isEmpty {
                                section("Focus windows", brief.focusWindows)
                            }
                            Text("Source: \(brief.source) · \(brief.briefDate)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                    }
                } else if loaded {
                    ContentUnavailableView(
                        "No brief for today",
                        systemImage: "sparkles",
                        description: Text("Generate one on web (`/pilot-brief`). This client only reads `pilot_briefs`.")
                    )
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Pilot Brief")
            .background(DayPilotTheme.background)
            .task { await load() }
            .refreshable { await load() }
            .overlay {
                if let error {
                    Text(error).foregroundStyle(.red).padding()
                }
            }
        }
    }

    private func metric(_ title: String, _ value: Int) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text("\(value)").foregroundStyle(DayPilotTheme.green)
        }
        .padding()
        .background(DayPilotTheme.card, in: RoundedRectangle(cornerRadius: 12))
    }

    private func section(_ title: String, _ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            ForEach(items, id: \.self) { item in
                Text("• \(item)")
            }
        }
    }

    private func load() async {
        do {
            brief = try await container.loadBrief()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loaded = true
    }
}
