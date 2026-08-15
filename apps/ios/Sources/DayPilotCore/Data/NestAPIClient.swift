import Foundation

public struct NestAPIClient: Sendable {
    private let config: AppConfig
    private let http: HTTPPerforming
    private let store: SessionStore

    public init(config: AppConfig, http: HTTPPerforming, store: SessionStore) {
        self.config = config
        self.http = http
        self.store = store
    }

    public func exchangeSupabaseToken(_ accessToken: String) async throws -> String {
        var request = URLRequest(url: config.nestAPIURL.appending(path: "/auth/supabase-exchange"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["accessToken": accessToken])
        let (data, response) = try await http.data(for: request)
        guard (200..<300).contains(response.statusCode) else {
            throw DayPilotError.nestExchangeFailed
        }
        let json = try JSONValue.object(data)
        if let token = json["accessToken"] as? String ?? json["access_token"] as? String {
            return token
        }
        throw DayPilotError.nestExchangeFailed
    }

    public func get(path: String, query: [String: String] = [:]) async throws -> Data {
        try await send(method: "GET", path: path, query: query, body: nil)
    }

    public func post(path: String, json: [String: Any]) async throws -> Data {
        try await send(method: "POST", path: path, query: [:], body: json)
    }

    private func send(
        method: String,
        path: String,
        query: [String: String],
        body: [String: Any]?
    ) async throws -> Data {
        guard var session = store.load() else { throw DayPilotError.notSignedIn }
        if session.nestAccessToken == nil {
            let nest = try await exchangeSupabaseToken(session.supabaseAccessToken)
            session.nestAccessToken = nest
            store.save(session)
        }

        var components = URLComponents(
            url: config.nestAPIURL.appending(path: path),
            resolvingAgainstBaseURL: false
        )
        if !query.isEmpty {
            components?.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components?.url else { throw DayPilotError.message("Bad Nest URL") }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = session.nestAccessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await http.data(for: request)
        if response.statusCode == 401 {
            let nest = try await exchangeSupabaseToken(session.supabaseAccessToken)
            session.nestAccessToken = nest
            store.save(session)
            request.setValue("Bearer \(nest)", forHTTPHeaderField: "Authorization")
            let retry = try await http.data(for: request)
            guard (200..<300).contains(retry.1.statusCode) else {
                throw DayPilotError.http(retry.1.statusCode, String(data: retry.0, encoding: .utf8) ?? "")
            }
            return retry.0
        }
        guard (200..<300).contains(response.statusCode) else {
            throw DayPilotError.http(response.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }
}

public struct NestCalendarEventsRepository: CalendarEventsRepository {
    private let client: NestAPIClient

    public init(client: NestAPIClient) {
        self.client = client
    }

    public func events(from: Date, to: Date) async throws -> [CalendarEvent] {
        let data = try await client.get(path: "/events", query: [
            "from": ISO8601.string(from: from),
            "to": ISO8601.string(from: to),
        ])
        return try NestEventDecoder.decodeList(data)
    }
}

public struct NestCalendarConnectionsRepository: CalendarConnectionsRepository {
    private let client: NestAPIClient

    public init(client: NestAPIClient) {
        self.client = client
    }

    public func list() async throws -> [CalendarConnectionStatus] {
        let data = try await client.get(path: "/calendar-connections")
        return try NestConnectionDecoder.decodeList(data)
    }
}

public struct NestEventKitCloudSyncRepository: EventKitCloudSyncing {
    private let client: NestAPIClient

    public init(client: NestAPIClient) {
        self.client = client
    }

    public func push(
        deviceId: String,
        deviceLabel: String,
        calendars: [DeviceCalendar],
        events: [DeviceEvent],
        rangeStart: Date,
        rangeEnd: Date
    ) async throws {
        let bodies = EventKitPayloadMapper.syncBodies(
            deviceId: deviceId,
            deviceLabel: deviceLabel,
            calendars: calendars,
            events: events,
            rangeStart: rangeStart,
            rangeEnd: rangeEnd
        )
        for body in bodies {
            _ = try await client.post(
                path: "/calendar-connections/apple/eventkit/sync",
                json: body
            )
        }
    }
}

enum NestEventDecoder {
    static func decodeList(_ data: Data) throws -> [CalendarEvent] {
        let rows = try JSONValue.array(data)
        return rows.compactMap { row in
            guard let id = row["id"] as? String ?? (row["id"] as? NSNumber)?.stringValue
                    ?? (row["id"] != nil ? String(describing: row["id"]!) : nil),
                  let title = row["title"] as? String,
                  let start = date(row["start"]),
                  let end = date(row["end"])
            else { return nil }
            return CalendarEvent(
                id: id,
                title: title,
                startsAt: start,
                endsAt: end,
                description: row["description"] as? String,
                location: row["location"] as? String,
                source: (row["source"] as? String) ?? "native",
                calendarColor: row["calendarColor"] as? String
            )
        }
    }

    private static func date(_ raw: Any?) -> Date? {
        guard let string = raw as? String else { return nil }
        return ISO8601.date(from: string)
    }
}

enum NestConnectionDecoder {
    static func decodeList(_ data: Data) throws -> [CalendarConnectionStatus] {
        let rows = try JSONValue.array(data)
        return rows.compactMap { row in
            guard let id = row["id"] as? String,
                  let provider = row["provider"] as? String
            else { return nil }
            let synced = (row["syncedAt"] as? String).flatMap(ISO8601.date(from:))
            return CalendarConnectionStatus(
                id: id,
                provider: provider,
                email: (row["email"] as? String) ?? "",
                connected: (row["connected"] as? Bool) ?? true,
                status: (row["status"] as? String) ?? "unknown",
                syncedAt: synced
            )
        }
    }
}
