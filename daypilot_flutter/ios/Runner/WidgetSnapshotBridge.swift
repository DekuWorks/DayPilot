import Flutter
import Foundation
import WidgetKit

enum WidgetSnapshotBridge {
    static let channelName = "daypilot/widget_snapshot"
    static let appGroup = "group.com.dekuworks.daypilot"
    static let key = "widget.snapshot.json"

    static func register(messenger: FlutterBinaryMessenger) {
        let channel = FlutterMethodChannel(name: channelName, binaryMessenger: messenger)
        channel.setMethodCallHandler { call, result in
            guard call.method == "writeSnapshot" else {
                result(FlutterMethodNotImplemented)
                return
            }
            guard let json = call.arguments as? String else {
                result(FlutterError(code: "bad_args", message: "Expected JSON string", details: nil))
                return
            }
            guard let defaults = UserDefaults(suiteName: appGroup) else {
                result(FlutterError(code: "no_group", message: "App Group unavailable", details: nil))
                return
            }
            defaults.set(json, forKey: key)
            WidgetCenter.shared.reloadAllTimelines()
            result(nil)
        }
    }
}
