import Foundation
import SwiftUI
import DayPilotCore

@MainActor
final class DependencyContainer: ObservableObject {
    @Published var session: AuthSession?
    @Published var oauthError: String?

    let config: AppConfig
    let auth: AuthRepository
    let loadEvents: LoadCalendarEventsUseCase
    let loadSync: LoadSyncStatusUseCase
    let loadBrief: LoadPilotBriefUseCase
    let loadProfile: LoadProfileUseCase
    let signInEmail: SignInWithEmailUseCase
    let signOut: SignOutUseCase
    let syncEventKit: SyncEventKitUseCase
    let eventKit: EventKitStoreRepository

    init(config: AppConfig = .fromBundle()) {
        self.config = config
        let store = UserDefaultsSessionStore()
        let http = URLSessionHTTPClient()
        let nest = NestAPIClient(config: config, http: http, store: store)
        let authRepo = SupabaseAuthRepository(config: config, http: http, store: store, nest: nest)
        let eventKitRepo = EventKitStoreRepository()
        self.auth = authRepo
        self.eventKit = eventKitRepo
        self.loadEvents = LoadCalendarEventsUseCase(repository: NestCalendarEventsRepository(client: nest))
        self.loadSync = LoadSyncStatusUseCase(repository: NestCalendarConnectionsRepository(client: nest))
        self.loadBrief = LoadPilotBriefUseCase(repository: SupabasePilotBriefRepository(config: config, http: http, store: store))
        self.loadProfile = LoadProfileUseCase(repository: SupabaseProfileRepository(config: config, http: http, store: store))
        self.signInEmail = SignInWithEmailUseCase(repository: authRepo)
        self.signOut = SignOutUseCase(repository: authRepo)
        self.syncEventKit = SyncEventKitUseCase(
            eventKit: eventKitRepo,
            cloud: NestEventKitCloudSyncRepository(client: nest)
        )
        self.session = store.load()
    }

    func refreshSession() async {
        session = await auth.currentSession()
    }

    func handleOAuthCallback(_ url: URL) async {
        do {
            session = try await auth.completeOAuth(callbackURL: url)
            oauthError = nil
        } catch {
            oauthError = error.localizedDescription
        }
    }
}
