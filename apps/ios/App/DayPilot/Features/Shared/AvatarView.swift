import SwiftUI

struct AvatarView: View {
    let url: URL?
    let name: String?

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(Circle())
    }

    private var placeholder: some View {
        ZStack {
            Circle().fill(DayPilotTheme.card)
            Text(initials)
                .font(.headline)
                .foregroundStyle(DayPilotTheme.green)
        }
    }

    private var initials: String {
        let parts = (name ?? "?").split(separator: " ")
        return String(parts.prefix(2).compactMap(\.first)).uppercased()
    }
}
