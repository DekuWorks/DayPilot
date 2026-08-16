import Foundation

public struct SupabaseAuthRepository: AuthRepository {
    private let config: AppConfig
    private let http: HTTPPerforming
    private let store: SessionStore
    private let nest: NestAPIClient

    public init(config: AppConfig, http: HTTPPerforming, store: SessionStore, nest: NestAPIClient) {
        self.config = config
        self.http = http
        self.store = store
        self.nest = nest
    }

    public func currentSession() async -> AuthSession? {
        store.load()
    }

    public func signIn(email: String, password: String) async throws -> AuthSession {
        guard config.isConfigured else {
            throw DayPilotError.notConfigured("SUPABASE_ANON_KEY")
        }
        var request = URLRequest(
            url: config.supabaseURL.appending(path: "/auth/v1/token")
                .appending(queryItems: [URLQueryItem(name: "grant_type", value: "password")])
        )
        request.httpMethod = "POST"
        applySupabaseHeaders(&request)
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email,
            "password": password,
        ])
        let (data, response) = try await http.data(for: request)
        guard (200..<300).contains(response.statusCode) else {
            throw DayPilotError.http(response.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return try await persist(from: data)
    }

    public func googleAuthorizeURL() throws -> URL {
        guard config.isConfigured else {
            throw DayPilotError.notConfigured("SUPABASE_ANON_KEY")
        }
        var components = URLComponents(
            url: config.supabaseURL.appending(path: "/auth/v1/authorize"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "provider", value: "google"),
            URLQueryItem(name: "redirect_to", value: config.oauthRedirectURI),
        ]
        guard let url = components?.url else {
            throw DayPilotError.message("Could not build Google sign-in URL")
        }
        return url
    }

    public func completeOAuth(callbackURL: URL) async throws -> AuthSession {
        let tokens = OAuthCallbackParser.tokens(from: callbackURL)
        guard let access = tokens.accessToken, let userId = tokens.userId ?? tokens.sub else {
            throw DayPilotError.message("Google sign-in did not return a session.")
        }
        var session = AuthSession(
            supabaseAccessToken: access,
            supabaseRefreshToken: tokens.refreshToken,
            userId: userId,
            email: tokens.email
        )
        session.nestAccessToken = try await nest.exchangeSupabaseToken(access)
        store.save(session)
        return session
    }

    public func signOut() async {
        store.clear()
    }

    private func persist(from data: Data) async throws -> AuthSession {
        let json = try JSONValue.object(data)
        guard let access = json["access_token"] as? String else {
            throw DayPilotError.decoding
        }
        let user = json["user"] as? [String: Any]
        let userId = (user?["id"] as? String) ?? ""
        let email = user?["email"] as? String
        var session = AuthSession(
            supabaseAccessToken: access,
            supabaseRefreshToken: json["refresh_token"] as? String,
            userId: userId,
            email: email
        )
        session.nestAccessToken = try await nest.exchangeSupabaseToken(access)
        store.save(session)
        return session
    }

    private func applySupabaseHeaders(_ request: inout URLRequest) {
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(config.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
    }
}

public struct SupabaseProfileRepository: ProfileRepository {
    private let config: AppConfig
    private let http: HTTPPerforming
    private let store: SessionStore

    public init(config: AppConfig, http: HTTPPerforming, store: SessionStore) {
        self.config = config
        self.http = http
        self.store = store
    }

    public func currentProfile() async throws -> UserProfile {
        guard let session = store.load() else { throw DayPilotError.notSignedIn }
        var components = URLComponents(
            url: config.supabaseURL.appending(path: "/rest/v1/profiles"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,email,display_name,full_name,avatar_url"),
            URLQueryItem(name: "id", value: "eq.\(session.userId)"),
        ]
        guard let url = components?.url else { throw DayPilotError.message("Bad profile URL") }
        var request = URLRequest(url: url)
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.supabaseAccessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await http.data(for: request)
        guard (200..<300).contains(response.statusCode) else {
            throw DayPilotError.http(response.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        let rows = try JSONValue.array(data)
        let row = rows.first
        let avatar = ResolveAvatarURL.resolve(profileAvatar: row?["avatar_url"] as? String)
        return UserProfile(
            id: (row?["id"] as? String) ?? session.userId,
            email: (row?["email"] as? String) ?? session.email,
            displayName: (row?["display_name"] as? String) ?? (row?["full_name"] as? String),
            avatarURL: avatar
        )
    }
}

public struct SupabasePilotBriefRepository: PilotBriefRepository {
    private let config: AppConfig
    private let http: HTTPPerforming
    private let store: SessionStore

    public init(config: AppConfig, http: HTTPPerforming, store: SessionStore) {
        self.config = config
        self.http = http
        self.store = store
    }

    public func todayBrief() async throws -> PilotBrief? {
        guard let session = store.load() else { throw DayPilotError.notSignedIn }
        let today = PilotBriefDate.today()
        var components = URLComponents(
            url: config.supabaseURL.appending(path: "/rest/v1/pilot_briefs"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(
                name: "select",
                value: "id,brief_date,content,created_at,updated_at"
            ),
            URLQueryItem(name: "brief_date", value: "eq.\(today)"),
        ]
        guard let url = components?.url else { throw DayPilotError.message("Bad brief URL") }
        var request = URLRequest(url: url)
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.supabaseAccessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        let (data, response) = try await http.data(for: request)
        guard (200..<300).contains(response.statusCode) else {
            throw DayPilotError.http(response.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        let rows = try JSONValue.array(data)
        guard let row = rows.first else { return nil }
        return PilotBriefDecoder.decode(row)
    }

    public func todayChat() async throws -> [PilotChatMessage] {
        guard let session = store.load() else { throw DayPilotError.notSignedIn }
        let today = PilotBriefDate.today()
        var components = URLComponents(
            url: config.supabaseURL.appending(path: "/rest/v1/pilot_brief_messages"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(
                name: "select",
                value: "id,brief_date,role,content,follow_ups,created_at"
            ),
            URLQueryItem(name: "brief_date", value: "eq.\(today)"),
            URLQueryItem(name: "order", value: "created_at.asc"),
        ]
        guard let url = components?.url else { throw DayPilotError.message("Bad chat URL") }
        var request = URLRequest(url: url)
        applyUserHeaders(&request, token: session.supabaseAccessToken)
        let (data, response) = try await http.data(for: request)
        guard (200..<300).contains(response.statusCode) else {
            throw DayPilotError.http(response.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return try JSONValue.array(data).compactMap(PilotChatDecoder.decode)
    }

    public func generateToday() async throws -> PilotBrief {
        let json = try await postPilotFunction(body: [:])
        guard let row = json["brief"] as? [String: Any],
              let brief = PilotBriefDecoder.decode(row)
        else { throw DayPilotError.decoding }
        return brief
    }

    public func sendChat(_ message: String) async throws -> PilotChatResult {
        let json = try await postPilotFunction(body: [
            "action": "chat",
            "message": message,
        ])
        guard let result = PilotChatDecoder.decodeResult(json) else {
            throw DayPilotError.decoding
        }
        return result
    }

    private func postPilotFunction(body: [String: Any]) async throws -> [String: Any] {
        guard let session = store.load() else { throw DayPilotError.notSignedIn }
        var request = URLRequest(
            url: config.supabaseURL.appending(path: "/functions/v1/pilot-brief")
        )
        request.httpMethod = "POST"
        applyUserHeaders(&request, token: session.supabaseAccessToken)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await http.data(for: request)
        guard (200..<300).contains(response.statusCode) else {
            let raw = String(data: data, encoding: .utf8) ?? ""
            if let object = try? JSONValue.object(data),
               let error = object["error"] as? String {
                throw DayPilotError.message(error)
            }
            throw DayPilotError.http(response.statusCode, raw)
        }
        return try JSONValue.object(data)
    }

    private func applyUserHeaders(_ request: inout URLRequest, token: String) {
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
}

enum PilotBriefDate {
    static func today(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

enum PilotChatDecoder {
    static func decode(_ row: [String: Any]) -> PilotChatMessage? {
        guard let id = row["id"] as? String,
              let role = row["role"] as? String,
              let content = row["content"] as? String
        else { return nil }
        return PilotChatMessage(
            id: id,
            role: role,
            content: content,
            followUps: row["follow_ups"] as? [String] ?? []
        )
    }

    static func decodeResult(_ json: [String: Any]) -> PilotChatResult? {
        guard let user = json["user_message"] as? [String: Any],
              let reply = json["reply"] as? [String: Any],
              let userMessage = decode(user),
              let assistant = decode(reply)
        else { return nil }
        return PilotChatResult(userMessage: userMessage, reply: assistant)
    }
}

enum PilotBriefDecoder {
    static func decode(_ row: [String: Any]) -> PilotBrief? {
        guard let id = row["id"] as? String,
              let briefDate = row["brief_date"] as? String
        else { return nil }
        let content = row["content"] as? [String: Any] ?? [:]
        return PilotBrief(
            id: id,
            briefDate: briefDate,
            summary: (content["summary"] as? String) ?? "",
            eventsToday: int(content["events_today"]),
            tasksDue: int(content["tasks_due"]),
            tasksOverdue: int(content["tasks_overdue"]),
            suggestions: content["suggestions"] as? [String] ?? [],
            conflicts: content["conflicts"] as? [String] ?? [],
            focusWindows: content["focus_windows"] as? [String] ?? [],
            source: (content["source"] as? String) ?? "fallback"
        )
    }

    private static func int(_ raw: Any?) -> Int {
        if let n = raw as? Int { return n }
        if let n = raw as? NSNumber { return n.intValue }
        return 0
    }
}

enum OAuthCallbackParser {
    static func tokens(from url: URL) -> (
        accessToken: String?,
        refreshToken: String?,
        userId: String?,
        sub: String?,
        email: String?
    ) {
        let fragment = url.fragment ?? ""
        let query = url.query ?? ""
        let combined = [fragment, query].joined(separator: "&")
        var values: [String: String] = [:]
        for pair in combined.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
            if parts.count == 2 {
                values[parts[0]] = parts[1].removingPercentEncoding ?? parts[1]
            }
        }
        let access = values["access_token"]
        let payload = access.flatMap(jwtPayload)
        return (
            access,
            values["refresh_token"],
            payload?["sub"] as? String,
            payload?["sub"] as? String,
            payload?["email"] as? String
        )
    }

    private static func jwtPayload(_ token: String) -> [String: Any]? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let pad = 4 - base64.count % 4
        if pad < 4 { base64 += String(repeating: "=", count: pad) }
        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return json
    }
}

private extension URL {
    func appending(queryItems: [URLQueryItem]) -> URL {
        var components = URLComponents(url: self, resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems
        return components?.url ?? self
    }
}
