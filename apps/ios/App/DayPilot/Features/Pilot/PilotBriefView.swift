import SwiftUI
import DayPilotCore

struct PilotBriefView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var brief: PilotBrief?
    @State private var messages: [PilotChatMessage] = []
    @State private var question = ""
    @State private var error: String?
    @State private var loaded = false
    @State private var generating = false
    @State private var asking = false

    var body: some View {
        NavigationStack {
            Group {
                if loaded {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            if let brief {
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
                            } else {
                                ContentUnavailableView(
                                    "No brief for today",
                                    systemImage: "sparkles",
                                    description: Text("Generate one from your schedule and tasks, or ask Pilot a question below.")
                                )
                            }

                            askPilot
                        }
                        .padding()
                    }
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Pilot Brief")
            .background(DayPilotTheme.background)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(generating ? "Generating…" : (brief == nil ? "Generate" : "Regenerate")) {
                        Task { await generate() }
                    }
                    .disabled(generating)
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .overlay {
                if let error {
                    Text(error).foregroundStyle(.red).padding()
                }
            }
        }
    }

    private var chips: [String] {
        if let last = messages.last(where: { !$0.isUser }), !last.followUps.isEmpty {
            return Array(last.followUps.prefix(3))
        }
        return [
            "What should I tackle first?",
            "Where can I fit a focus block?",
            "Any conflicts I should fix?",
        ]
    }

    private var askPilot: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Ask Pilot").font(.headline)
            if messages.isEmpty && !asking {
                Text("Ask about meetings, tasks, conflicts, or where to focus. Pilot only uses today’s DayPilot data.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            ForEach(messages) { message in
                HStack {
                    if message.isUser { Spacer(minLength: 40) }
                    Text(message.content)
                        .padding(10)
                        .background(
                            message.isUser ? DayPilotTheme.green : DayPilotTheme.card,
                            in: RoundedRectangle(cornerRadius: 12)
                        )
                    if !message.isUser { Spacer(minLength: 40) }
                }
            }
            if asking {
                Text("Pilot is thinking…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            FlowChips(items: chips) { chip in
                Task { await ask(chip) }
            }
            HStack {
                TextField("Ask about today…", text: $question)
                    .textFieldStyle(.roundedBorder)
                    .disabled(asking)
                Button {
                    Task { await ask(question) }
                } label: {
                    Image(systemName: "paperplane.fill")
                }
                .disabled(asking || question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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
                Button("• \(item)") {
                    Task { await ask("Tell me more: \(item)") }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func load() async {
        do {
            async let briefTask = container.loadBrief()
            async let chatTask = container.loadBriefChat()
            brief = try await briefTask
            messages = (try? await chatTask) ?? []
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loaded = true
    }

    private func generate() async {
        generating = true
        defer { generating = false }
        do {
            brief = try await container.generateBrief()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func ask(_ raw: String) async {
        let message = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty, !asking else { return }
        question = ""
        asking = true
        defer { asking = false }
        do {
            let result = try await container.sendBriefChat(message)
            messages.append(contentsOf: [result.userMessage, result.reply])
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct FlowChips: View {
    let items: [String]
    let onPick: (String) -> Void

    var body: some View {
        FlexibleChipWrap(items: items, onPick: onPick)
    }
}

private struct FlexibleChipWrap: View {
    let items: [String]
    let onPick: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button(item) { onPick(item) }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
            }
        }
    }
}
