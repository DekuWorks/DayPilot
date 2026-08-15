import Foundation

public protocol HTTPPerforming: Sendable {
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

public struct URLSessionHTTPClient: HTTPPerforming {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw DayPilotError.message("Invalid response")
        }
        return (data, http)
    }
}

enum JSONValue {
    static func object(_ data: Data) throws -> [String: Any] {
        let raw = try JSONSerialization.jsonObject(with: data)
        guard let object = raw as? [String: Any] else { throw DayPilotError.decoding }
        return object
    }

    static func array(_ data: Data) throws -> [[String: Any]] {
        let raw = try JSONSerialization.jsonObject(with: data)
        guard let array = raw as? [[String: Any]] else { throw DayPilotError.decoding }
        return array
    }
}
