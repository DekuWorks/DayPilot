import Foundation

/// Same rule as Flutter `resolveAvatarUrl` / web `persistSharedAvatarIfMissing`:
/// `profiles.avatar_url` wins, then SSO metadata.
public enum ResolveAvatarURL {
    public static func resolve(
        profileAvatar: String?,
        metadataAvatar: String? = nil
    ) -> URL? {
        let candidates = [profileAvatar, metadataAvatar]
        for raw in candidates {
            guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !trimmed.isEmpty,
                  let url = URL(string: trimmed),
                  let scheme = url.scheme?.lowercased(),
                  scheme == "https" || scheme == "http"
            else { continue }
            return url
        }
        return nil
    }
}
