import Foundation
import Security

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

/// Keychain-backed session. Migrates a one-time copy from UserDefaults.
public final class KeychainSessionStore: SessionStore, @unchecked Sendable {
    private let service: String
    private let account: String
    private let lock = NSLock()
    private var cached: AuthSession?

    public init(
        service: String = "co.daypilot.session",
        account: String = "auth",
        migrateFrom defaults: UserDefaults = .standard
    ) {
        self.service = service
        self.account = account
        if load() == nil {
            let legacy = UserDefaultsSessionStore(defaults: defaults)
            if let session = legacy.load() {
                save(session)
                legacy.clear()
            }
        }
    }

    public func load() -> AuthSession? {
        lock.lock()
        defer { lock.unlock() }
        if let cached { return cached }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess,
              let data = item as? Data,
              let stored = try? JSONDecoder().decode(StoredSession.self, from: data)
        else { return nil }
        cached = stored.asSession
        return cached
    }

    public func save(_ session: AuthSession) {
        lock.lock()
        cached = session
        lock.unlock()
        let stored = StoredSession(session)
        guard let data = try? JSONEncoder().encode(stored) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    public func clear() {
        lock.lock()
        cached = nil
        lock.unlock()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

struct StoredSession: Codable {
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
