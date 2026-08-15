import SwiftUI
import DayPilotCore

struct SettingsView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var profile: UserProfile?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 12) {
                        AvatarView(url: profile?.avatarURL, name: profile?.displayName ?? profile?.email)
                        VStack(alignment: .leading) {
                            Text(profile?.displayName ?? "Profile")
                            Text(profile?.email ?? container.session?.email ?? "")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Section("API") {
                    LabeledContent("Nest", value: container.config.nestAPIURL.host ?? "")
                    LabeledContent("Supabase", value: container.config.supabaseURL.host ?? "")
                    Text("Pages stay on Railway until api.daypilot.co/health is 200.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Button("Sign out", role: .destructive) {
                    Task {
                        await container.signOut()
                        container.session = nil
                    }
                }
            }
            .navigationTitle("Settings")
            .task {
                profile = try? await container.loadProfile()
            }
        }
    }
}
