import Foundation

public struct LoadCalendarEventsUseCase: Sendable {
    private let repository: CalendarEventsRepository

    public init(repository: CalendarEventsRepository) {
        self.repository = repository
    }

    public func callAsFunction(from: Date, to: Date) async throws -> [CalendarEvent] {
        try await repository.events(from: from, to: to)
            .sorted { $0.startsAt < $1.startsAt }
    }
}

public struct LoadSyncStatusUseCase: Sendable {
    private let repository: CalendarConnectionsRepository

    public init(repository: CalendarConnectionsRepository) {
        self.repository = repository
    }

    public func callAsFunction() async throws -> [CalendarConnectionStatus] {
        try await repository.list()
    }
}

public struct LoadPilotBriefUseCase: Sendable {
    private let repository: PilotBriefRepository

    public init(repository: PilotBriefRepository) {
        self.repository = repository
    }

    public func callAsFunction() async throws -> PilotBrief? {
        try await repository.todayBrief()
    }
}

public struct LoadPilotBriefChatUseCase: Sendable {
    private let repository: PilotBriefRepository

    public init(repository: PilotBriefRepository) {
        self.repository = repository
    }

    public func callAsFunction() async throws -> [PilotChatMessage] {
        try await repository.todayChat()
    }
}

public struct GeneratePilotBriefUseCase: Sendable {
    private let repository: PilotBriefRepository

    public init(repository: PilotBriefRepository) {
        self.repository = repository
    }

    public func callAsFunction() async throws -> PilotBrief {
        try await repository.generateToday()
    }
}

public struct SendPilotBriefChatUseCase: Sendable {
    private let repository: PilotBriefRepository

    public init(repository: PilotBriefRepository) {
        self.repository = repository
    }

    public func callAsFunction(_ message: String) async throws -> PilotChatResult {
        try await repository.sendChat(message)
    }
}

public struct LoadProfileUseCase: Sendable {
    private let repository: ProfileRepository

    public init(repository: ProfileRepository) {
        self.repository = repository
    }

    public func callAsFunction() async throws -> UserProfile {
        try await repository.currentProfile()
    }
}

public struct SignInWithEmailUseCase: Sendable {
    private let repository: AuthRepository

    public init(repository: AuthRepository) {
        self.repository = repository
    }

    public func callAsFunction(email: String, password: String) async throws -> AuthSession {
        try await repository.signIn(email: email, password: password)
    }
}

public struct SignOutUseCase: Sendable {
    private let repository: AuthRepository

    public init(repository: AuthRepository) {
        self.repository = repository
    }

    public func callAsFunction() async {
        await repository.signOut()
    }
}

public struct SyncEventKitUseCase: Sendable {
    private let eventKit: EventKitAccessing
    private let cloud: EventKitCloudSyncing

    public init(eventKit: EventKitAccessing, cloud: EventKitCloudSyncing) {
        self.eventKit = eventKit
        self.cloud = cloud
    }

    public func callAsFunction(selectedCalendarIds: [String]?) async throws {
        let granted = try await eventKit.requestAccess()
        guard granted else { throw DayPilotError.eventKitDenied }

        let all = try await eventKit.calendars()
        let selected: [DeviceCalendar]
        if let ids = selectedCalendarIds, !ids.isEmpty {
            selected = all.map { cal in
                var copy = cal
                copy.isSelected = ids.contains(cal.id)
                return copy
            }
        } else {
            selected = all
        }

        let now = Date()
        let start = Calendar.current.date(byAdding: .day, value: -90, to: now) ?? now
        let end = Calendar.current.date(byAdding: .day, value: 365, to: now) ?? now
        let ids = selected.filter(\.isSelected).map(\.id)
        let events = try await eventKit.events(calendarIds: ids, from: start, to: end)

        try await cloud.push(
            deviceId: await eventKit.deviceId(),
            deviceLabel: eventKit.deviceLabel(),
            calendars: selected,
            events: events,
            rangeStart: start,
            rangeEnd: end
        )
    }
}
