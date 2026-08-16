import SwiftUI

enum WidgetTheme {
    static let charcoal = Color(red: 0.05, green: 0.07, blue: 0.06)
    static let card = Color(red: 0.10, green: 0.12, blue: 0.11)
    static let green = Color(red: 0.22, green: 1.0, blue: 0.08)
    static let blue = Color(red: 0.23, green: 0.51, blue: 0.96)
    static let purple = Color(red: 0.66, green: 0.33, blue: 0.97)
    static let orange = Color(red: 0.96, green: 0.65, blue: 0.14)
    static let secondary = Color.white.opacity(0.55)
    static let muted = Color.white.opacity(0.38)

    static let palette = [blue, green, purple, orange]

    static func color(hex: String?, index: Int) -> Color {
        if let hex, let parsed = Color(hex: hex) { return parsed }
        return palette[index % palette.count]
    }
}

extension Color {
    init?(hex: String) {
        var raw = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if raw.hasPrefix("#") { raw.removeFirst() }
        guard raw.count == 6, let value = Int(raw, radix: 16) else { return nil }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}
