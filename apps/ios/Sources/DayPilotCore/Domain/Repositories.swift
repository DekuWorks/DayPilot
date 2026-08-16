import Foundation

public protocol AuthRepository: Sendable {
    func currentSession() async -> AuthSession?
    func signIn(email: String, password: String) async throws -> AuthSession
    func completeOAuth(callbackURL: URL) async throws -> AuthSession
    func googleAuthorizeURL() throws -> URL
    func signOut() async
}

public protocol CalendarEventsRepository: Sendable {
    func events(from: Date, to: Date) async throws -> [CalendarEvent]
}

public protocol CalendarConnectionsRepository: Sendable {
    func list() async throws -> [CalendarConnectionStatus]
}

public protocol ProfileRepository: Sendable {
    func currentProfile() async throws -> UserProfile
}

public protocol PilotBriefRepository: Sendable {
    func todayBrief() async throws -> PilotBrief?
    func todayChat() async throws -> [PilotChatMessage]
    func generateToday() async throws -> PilotBrief
    func sendChat(_ message: String) async throws -> PilotChatResult
}

public protocol EventKitAccessing: Sendable {
    func requestAccess() async throws -> Bool
    func calendars() async throws -> [DeviceCalendar]
    func events(calendarIds: [String], from: Date, to: Date) async throws -> [DeviceEvent]
    func deviceId() async -> String
    func deviceLabel() -> String
}

public protocol EventKitCloudSyncing: Sendable {
    func push(
        deviceId: String,
        deviceLabel: String,
        calendars: [DeviceCalendar],
        events: [DeviceEvent],
        rangeStart: Date,
        rangeEnd: Date
    ) async throws
}

public protocol SessionStore: Sendable {
    func load() -> AuthSession?
    func save(_ session: AuthSession)
    func clear()
}
