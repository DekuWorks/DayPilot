import XCTest
@testable import DayPilotCore

final class ResolveAvatarURLTests: XCTestCase {
    func testPrefersProfileColumnOverMetadata() {
        let url = ResolveAvatarURL.resolve(
            profileAvatar: "https://example.com/profile.jpg",
            metadataAvatar: "https://example.com/sso.jpg"
        )
        XCTAssertEqual(url?.absoluteString, "https://example.com/profile.jpg")
    }

    func testFallsBackToMetadataWhenProfileMissing() {
        let url = ResolveAvatarURL.resolve(
            profileAvatar: "  ",
            metadataAvatar: "https://lh3.googleusercontent.com/a/photo"
        )
        XCTAssertEqual(url?.host, "lh3.googleusercontent.com")
    }

    func testRejectsNonHTTP() {
        XCTAssertNil(ResolveAvatarURL.resolve(profileAvatar: "javascript:alert(1)"))
        XCTAssertNil(ResolveAvatarURL.resolve(profileAvatar: nil, metadataAvatar: nil))
    }
}

final class EventKitPayloadMapperTests: XCTestCase {
    func testChunksMatchFlutterSize() {
        XCTAssertEqual(EventKitPayloadMapper.chunkSize, 250)
        XCTAssertEqual(EventKitPayloadMapper.chunks([Int]()).count, 1)
        let events = Array(1...251)
        let chunks = EventKitPayloadMapper.chunks(events)
        XCTAssertEqual(chunks.count, 2)
        XCTAssertEqual(chunks[0].count, 250)
        XCTAssertEqual(chunks[1].count, 1)
    }

    func testSyncBodiesReconcileOnlyOnLastChunk() {
        let calendars = [DeviceCalendar(id: "cal-1", title: "Home")]
        let events = (0..<251).map { i in
            DeviceEvent(
                id: "e-\(i)",
                calendarId: "cal-1",
                title: "Event \(i)",
                startsAt: Date(timeIntervalSince1970: 1_700_000_000),
                endsAt: Date(timeIntervalSince1970: 1_700_003_600)
            )
        }
        let bodies = EventKitPayloadMapper.syncBodies(
            deviceId: "device-1",
            deviceLabel: "iPhone",
            calendars: calendars,
            events: events,
            rangeStart: Date(timeIntervalSince1970: 0),
            rangeEnd: Date(timeIntervalSince1970: 10)
        )
        XCTAssertEqual(bodies.count, 2)
        XCTAssertEqual(bodies[0]["reconcileDeletes"] as? Bool, false)
        XCTAssertEqual(bodies[1]["reconcileDeletes"] as? Bool, true)
        XCTAssertEqual(bodies[0]["deviceId"] as? String, "device-1")
        XCTAssertEqual((bodies[0]["events"] as? [[String: Any]])?.count, 250)
        XCTAssertEqual((bodies[1]["events"] as? [[String: Any]])?.count, 1)
    }

    func testBlankEventTitleBecomesPlaceholder() {
        let json = EventKitPayloadMapper.eventJSON(
            DeviceEvent(
                id: "1",
                calendarId: "c",
                title: "  ",
                startsAt: Date(),
                endsAt: Date()
            )
        )
        XCTAssertEqual(json["title"] as? String, "(No title)")
    }
}

final class LoadCalendarEventsUseCaseTests: XCTestCase {
    func testSortsByStartTime() async throws {
        let later = CalendarEvent(
            id: "2",
            title: "Later",
            startsAt: Date(timeIntervalSince1970: 200),
            endsAt: Date(timeIntervalSince1970: 300)
        )
        let earlier = CalendarEvent(
            id: "1",
            title: "Earlier",
            startsAt: Date(timeIntervalSince1970: 100),
            endsAt: Date(timeIntervalSince1970: 150)
        )
        let useCase = LoadCalendarEventsUseCase(repository: FakeEvents([later, earlier]))
        let loaded = try await useCase(
            from: Date(timeIntervalSince1970: 0),
            to: Date(timeIntervalSince1970: 400)
        )
        XCTAssertEqual(loaded.map(\.id), ["1", "2"])
    }
}

final class NestEventDecoderTests: XCTestCase {
    func testDecodesNestEventShape() throws {
        let json = """
        [{"id":"evt_1","title":"Standup","start":"2026-08-15T13:00:00.000Z","end":"2026-08-15T13:30:00.000Z","source":"outlook","location":"Teams"}]
        """.data(using: .utf8)!
        let events = try NestEventDecoder.decodeList(json)
        XCTAssertEqual(events.count, 1)
        XCTAssertEqual(events[0].title, "Standup")
        XCTAssertEqual(events[0].source, "outlook")
        XCTAssertEqual(events[0].location, "Teams")
    }
}

final class PilotBriefDecoderTests: XCTestCase {
    func testReadsWebContentShape() {
        let row: [String: Any] = [
            "id": "brief-1",
            "brief_date": "2026-08-15",
            "content": [
                "summary": "Three meetings, one overdue task.",
                "events_today": 3,
                "tasks_due": 2,
                "tasks_overdue": 1,
                "suggestions": ["Block focus after lunch"],
                "conflicts": [],
                "focus_windows": ["09:00-11:00"],
                "source": "fallback",
            ],
        ]
        let brief = PilotBriefDecoder.decode(row)
        XCTAssertEqual(brief?.summary, "Three meetings, one overdue task.")
        XCTAssertEqual(brief?.eventsToday, 3)
        XCTAssertEqual(brief?.tasksOverdue, 1)
        XCTAssertEqual(brief?.suggestions, ["Block focus after lunch"])
    }
}

private struct FakeEvents: CalendarEventsRepository {
    let items: [CalendarEvent]
    init(_ items: [CalendarEvent]) { self.items = items }
    func events(from: Date, to: Date) async throws -> [CalendarEvent] { items }
}
