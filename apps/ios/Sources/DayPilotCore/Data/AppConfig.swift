import Foundation

public struct AppConfig: Equatable, Sendable {
    public var supabaseURL: URL
    public var supabaseAnonKey: String
    public var nestAPIURL: URL
    public var oauthRedirectURI: String

    public init(
        supabaseURL: URL,
        supabaseAnonKey: String,
        nestAPIURL: URL,
        oauthRedirectURI: String = "daypilot-swift://auth-callback"
    ) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.nestAPIURL = nestAPIURL
        self.oauthRedirectURI = oauthRedirectURI
    }

    public var isConfigured: Bool {
        !supabaseAnonKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Railway stays the Nest origin until `https://api.daypilot.co/health` is 200.
    public static let productionNestFallback = URL(
        string: "https://api-production-6c2c.up.railway.app"
    )!

    public static let productionSupabase = URL(
        string: "https://wmkytyrcxbzjqiykbauw.supabase.co"
    )!

    public static func fromBundle(_ bundle: Bundle = .main) -> AppConfig {
        let supabase = url(
            bundle.infoDictionary?["SUPABASE_URL"] as? String,
            fallback: productionSupabase
        )
        let nest = url(
            bundle.infoDictionary?["DAYPILOT_API_URL"] as? String,
            fallback: productionNestFallback
        )
        let key = (bundle.infoDictionary?["SUPABASE_ANON_KEY"] as? String) ?? ""
        return AppConfig(supabaseURL: supabase, supabaseAnonKey: key, nestAPIURL: nest)
    }

    private static func url(_ raw: String?, fallback: URL) -> URL {
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines),
              !trimmed.isEmpty,
              let parsed = URL(string: trimmed)
        else { return fallback }
        return parsed
    }
}
