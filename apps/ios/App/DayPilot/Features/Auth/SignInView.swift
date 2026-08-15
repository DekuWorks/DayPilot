import AuthenticationServices
import SwiftUI
import UIKit
import DayPilotCore

struct SignInView: View {
    @EnvironmentObject private var container: DependencyContainer
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("DayPilot")
                    .font(.largeTitle.bold())
                    .foregroundStyle(DayPilotTheme.green)
                Text("Sign in with the same Supabase account as web and Flutter.")
                    .foregroundStyle(.secondary)

                TextField("Email", text: $email)
                    .textContentType(.username)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .padding(12)
                    .background(DayPilotTheme.card, in: RoundedRectangle(cornerRadius: 10))
                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .padding(12)
                    .background(DayPilotTheme.card, in: RoundedRectangle(cornerRadius: 10))

                if let error {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }
                if let oauth = container.oauthError {
                    Text(oauth).foregroundStyle(.red).font(.footnote)
                }

                Button(busy ? "Signing in…" : "Sign in") {
                    Task { await signInEmail() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(busy || email.isEmpty || password.isEmpty)

                Button("Continue with Google") {
                    Task { await signInGoogle() }
                }
                .buttonStyle(.bordered)
                .disabled(busy)

                Spacer()
            }
            .padding(24)
            .background(DayPilotTheme.background.ignoresSafeArea())
        }
    }

    private func signInEmail() async {
        busy = true
        defer { busy = false }
        do {
            container.session = try await container.signInEmail(email: email, password: password)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func signInGoogle() async {
        busy = true
        defer { busy = false }
        do {
            let url = try container.auth.googleAuthorizeURL()
            let callback = try await GoogleAuthPresenter.present(url: url)
            await container.handleOAuthCallback(callback)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

enum GoogleAuthPresenter {
    @MainActor
    static func present(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "daypilot-swift"
            ) { callback, error in
                if let callback {
                    continuation.resume(returning: callback)
                } else {
                    continuation.resume(throwing: error ?? DayPilotError.message("Google sign-in cancelled"))
                }
            }
            session.presentationContextProvider = AnchorStore.shared
            session.prefersEphemeralWebBrowserSession = true
            _ = session.start()
            AnchorStore.shared.session = session
        }
    }
}

final class AnchorStore: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = AnchorStore()
    var session: ASWebAuthenticationSession?

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
