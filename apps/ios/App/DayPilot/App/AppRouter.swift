import SwiftUI
import DayPilotCore

struct AppRouter: View {
    @EnvironmentObject private var container: DependencyContainer

    var body: some View {
        Group {
            if !container.config.isConfigured {
                MissingConfigView()
            } else if container.session == nil {
                SignInView()
            } else {
                MainTabView()
            }
        }
        .tint(DayPilotTheme.green)
        .preferredColorScheme(.dark)
        .task { await container.refreshSession() }
    }
}

private struct MainTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max") }
            CalendarHomeView()
                .tabItem { Label("Calendar", systemImage: "calendar") }
            TasksView()
                .tabItem { Label("Tasks", systemImage: "checkmark.circle") }
            PilotBriefView()
                .tabItem { Label("Pilot", systemImage: "sparkles") }
            SyncView()
                .tabItem { Label("Sync", systemImage: "arrow.triangle.2.circlepath") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

private struct MissingConfigView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Configuration missing")
                .font(.title2.bold())
            Text("Copy apps/ios/Config.example.xcconfig to Config.local.xcconfig and set SUPABASE_ANON_KEY. The anon key is the same public key Flutter uses — not a Google or Microsoft secret.")
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(DayPilotTheme.background)
    }
}
