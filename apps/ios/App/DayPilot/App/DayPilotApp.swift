import SwiftUI
import DayPilotCore

@main
struct DayPilotApp: App {
    @StateObject private var container = DependencyContainer()

    var body: some Scene {
        WindowGroup {
            AppRouter()
                .environmentObject(container)
                .onOpenURL { url in
                    Task { await container.handleOAuthCallback(url) }
                }
        }
    }
}
