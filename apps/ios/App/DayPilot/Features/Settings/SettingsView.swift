import SwiftUI
import DayPilotCore

struct SettingsView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var profile: UserProfile?
    @State private var deleting = false
    @State private var error: String?
    @State private var showDeleteConfirm = false

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
                if let error {
                    Section {
                        Text(error).foregroundStyle(.red).font(.footnote)
                    }
                }
                Button("Sign out", role: .destructive) {
                    Task {
                        await container.signOut()
                        container.session = nil
                    }
                }
                Section {
                    Button(deleting ? "Deleting…" : "Delete account", role: .destructive) {
                        showDeleteConfirm = true
                    }
                    .disabled(deleting)
                } footer: {
                    Text("Permanently deletes your DayPilot account and associated data. This cannot be undone.")
                }
            }
            .navigationTitle("Settings")
            .task {
                profile = try? await container.loadProfile()
            }
            .confirmationDialog(
                "Delete account?",
                isPresented: $showDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("Delete account", role: .destructive) {
                    Task { await performDelete() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes your DayPilot account, calendar connections, and profile data.")
            }
        }
    }

    private func performDelete() async {
        deleting = true
        error = nil
        defer { deleting = false }
        do {
            try await container.deleteAccount()
            container.session = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}
