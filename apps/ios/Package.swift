// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DayPilotCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "DayPilotCore", targets: ["DayPilotCore"]),
    ],
    targets: [
        .target(name: "DayPilotCore"),
        .testTarget(
            name: "DayPilotCoreTests",
            dependencies: ["DayPilotCore"]
        ),
    ]
)
