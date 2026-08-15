import Foundation

public final class InMemorySessionStore: SessionStore, @unchecked Sendable {
    private var session: AuthSession?
    private let lock = NSLock()

    public init(session: AuthSession? = nil) {
        self.session = session
    }

    public func load() -> AuthSession? {
        lock.lock()
        defer { lock.unlock() }
        return session
    }

    public func save(_ session: AuthSession) {
        lock.lock()
        self.session = session
        lock.unlock()
    }

    public func clear() {
        lock.lock()
        session = nil
        lock.unlock()
    }
}

public final class UserDefaultsSessionStore: SessionStore, @unchecked Sendable {
    private let defaults: UserDefaults
    private let key: String

    public init(defaults: UserDefaults = .standard, key: String = "daypilot.auth.session") {
        self.defaults = defaults
        self.key = key
    }

    public func load() -> AuthSession? {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode(StoredSession.self, from: data)
        else { return nil }
        return decoded.asSession
    }

    public func save(_ session: AuthSession) {
        let stored = StoredSession(session)
        if let data = try? JSONEncoder().encode(stored) {
            defaults.set(data, forKey: key)
        }
    }

    public func clear() {
        defaults.removeObject(forKey: key)
    }
}

private struct StoredSession: Codable {
    var supabaseAccessToken: String
    var supabaseRefreshToken: String?
    var nestAccessToken: String?
    var userId: String
    var email: String?

    init(_ session: AuthSession) {
        supabaseAccessToken = session.supabaseAccessToken
        supabaseRefreshToken = session.supabaseRefreshToken
        nestAccessToken = session.nestAccessToken
        userId = session.userId
        email = session.email
    }

    var asSession: AuthSession {
        AuthSession(
            supabaseAccessToken: supabaseAccessToken,
            supabaseRefreshToken: supabaseRefreshToken,
            nestAccessToken: nestAccessToken,
            userId: userId,
            email: email
        )
    }
}
