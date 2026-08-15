import Foundation

public struct AuthSession: Equatable, Sendable {
    public var supabaseAccessToken: String
    public var supabaseRefreshToken: String?
    public var nestAccessToken: String?
    public var userId: String
    public var email: String?

    public init(
        supabaseAccessToken: String,
        supabaseRefreshToken: String? = nil,
        nestAccessToken: String? = nil,
        userId: String,
        email: String? = nil
    ) {
        self.supabaseAccessToken = supabaseAccessToken
        self.supabaseRefreshToken = supabaseRefreshToken
        self.nestAccessToken = nestAccessToken
        self.userId = userId
        self.email = email
    }

    public var hasNestJWT: Bool { nestAccessToken?.isEmpty == false }
}

public struct CalendarEvent: Equatable, Identifiable, Sendable {
    public var id: String
    public var title: String
    public var startsAt: Date
    public var endsAt: Date
    public var description: String?
    public var location: String?
    public var source: String
    public var calendarColor: String?

    public init(
        id: String,
        title: String,
        startsAt: Date,
        endsAt: Date,
        description: String? = nil,
        location: String? = nil,
        source: String = "native",
        calendarColor: String? = nil
    ) {
        self.id = id
        self.title = title
        self.startsAt = startsAt
        self.endsAt = endsAt
        self.description = description
        self.location = location
        self.source = source
        self.calendarColor = calendarColor
    }
}

public struct CalendarConnectionStatus: Equatable, Identifiable, Sendable {
    public var id: String
    public var provider: String
    public var email: String
    public var connected: Bool
    public var status: String
    public var syncedAt: Date?

    public init(
        id: String,
        provider: String,
        email: String,
        connected: Bool,
        status: String,
        syncedAt: Date? = nil
    ) {
        self.id = id
        self.provider = provider
        self.email = email
        self.connected = connected
        self.status = status
        self.syncedAt = syncedAt
    }

    public var displayName: String {
        switch provider {
        case "google": return "Google"
        case "outlook": return "Outlook"
        case "apple", "apple_eventkit": return "Apple"
        default: return provider
        }
    }
}

public struct UserProfile: Equatable, Sendable {
    public var id: String
    public var email: String?
    public var displayName: String?
    public var avatarURL: URL?

    public init(
        id: String,
        email: String? = nil,
        displayName: String? = nil,
        avatarURL: URL? = nil
    ) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.avatarURL = avatarURL
    }
}

public struct PilotBrief: Equatable, Sendable {
    public var id: String
    public var briefDate: String
    public var summary: String
    public var eventsToday: Int
    public var tasksDue: Int
    public var tasksOverdue: Int
    public var suggestions: [String]
    public var conflicts: [String]
    public var focusWindows: [String]
    public var source: String

    public init(
        id: String,
        briefDate: String,
        summary: String,
        eventsToday: Int = 0,
        tasksDue: Int = 0,
        tasksOverdue: Int = 0,
        suggestions: [String] = [],
        conflicts: [String] = [],
        focusWindows: [String] = [],
        source: String = "fallback"
    ) {
        self.id = id
        self.briefDate = briefDate
        self.summary = summary
        self.eventsToday = eventsToday
        self.tasksDue = tasksDue
        self.tasksOverdue = tasksOverdue
        self.suggestions = suggestions
        self.conflicts = conflicts
        self.focusWindows = focusWindows
        self.source = source
    }
}

public struct DeviceCalendar: Equatable, Identifiable, Sendable {
    public var id: String
    public var title: String
    public var calendarType: String?
    public var sourceName: String?
    public var color: String?
    public var isPrimary: Bool
    public var isReadOnly: Bool
    public var isSelected: Bool

    public init(
        id: String,
        title: String,
        calendarType: String? = nil,
        sourceName: String? = nil,
        color: String? = nil,
        isPrimary: Bool = false,
        isReadOnly: Bool = false,
        isSelected: Bool = true
    ) {
        self.id = id
        self.title = title
        self.calendarType = calendarType
        self.sourceName = sourceName
        self.color = color
        self.isPrimary = isPrimary
        self.isReadOnly = isReadOnly
        self.isSelected = isSelected
    }
}

public struct DeviceEvent: Equatable, Identifiable, Sendable {
    public var id: String
    public var calendarId: String
    public var title: String
    public var startsAt: Date
    public var endsAt: Date
    public var description: String?
    public var location: String?
    public var allDay: Bool

    public init(
        id: String,
        calendarId: String,
        title: String,
        startsAt: Date,
        endsAt: Date,
        description: String? = nil,
        location: String? = nil,
        allDay: Bool = false
    ) {
        self.id = id
        self.calendarId = calendarId
        self.title = title
        self.startsAt = startsAt
        self.endsAt = endsAt
        self.description = description
        self.location = location
        self.allDay = allDay
    }
}

public enum DayPilotError: Error, Equatable, LocalizedError {
    case notConfigured(String)
    case notSignedIn
    case nestExchangeFailed
    case http(Int, String)
    case decoding
    case eventKitDenied
    case message(String)

    public var errorDescription: String? {
        switch self {
        case .notConfigured(let key): return "Missing \(key). See apps/ios/README.md."
        case .notSignedIn: return "Sign in to continue."
        case .nestExchangeFailed: return "Could not exchange the Supabase session for a Nest token."
        case .http(let code, let body): return "Request failed (\(code)): \(body)"
        case .decoding: return "Could not read the server response."
        case .eventKitDenied: return "Calendar access was denied."
        case .message(let text): return text
        }
    }
}
