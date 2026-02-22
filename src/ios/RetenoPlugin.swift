import Foundation
import UIKit
import UserNotifications
import Reteno

@objc(RetenoPlugin)
class RetenoPlugin: CDVPlugin {
  private static weak var activeInstance: RetenoPlugin?

  override func pluginInitialize() {
    RetenoPlugin.activeInstance = self
  }

  override func onAppTerminate() {
    if RetenoPlugin.activeInstance === self {
      RetenoPlugin.activeInstance = nil
    }
    super.onAppTerminate()
  }

  @objc(initialize:)
  func initialize(_ command: CDVInvokedUrlCommand) {
    let options = (command.arguments.first as? [String: Any]) ?? [:]

    let providedKey = (options["accessKey"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
    let preferenceKey = getPreference("sdk_access_key")?.trimmingCharacters(in: .whitespacesAndNewlines)
    let accessKey = (providedKey?.isEmpty == false) ? providedKey : preferenceKey

    guard let apiKey = accessKey, !apiKey.isEmpty else {
      sendError("Missing SDK access key. Provide options.accessKey or set preference SDK_ACCESS_KEY.", to: command)
      return
    }

    DispatchQueue.main.async {
      Reteno.start(apiKey: apiKey)

      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(requestNotificationPermission:)
  func requestNotificationPermission(_ command: CDVInvokedUrlCommand) {
    DispatchQueue.main.async {
      Reteno.userNotificationService.registerForRemoteNotifications(
        with: [.sound, .alert, .badge],
        application: UIApplication.shared
      )
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(setDeviceToken:)
  func setDeviceToken(_ command: CDVInvokedUrlCommand) {
    let arg0 = command.arguments.first
    var token: String?

    if let tokenString = arg0 as? String {
      token = tokenString
    } else if let payload = arg0 as? [String: Any] {
      token = payload["token"] as? String
    }

    guard let tokenValue = token?.trimmingCharacters(in: .whitespacesAndNewlines),
          !tokenValue.isEmpty else {
      sendError("Missing argument: token", to: command)
      return
    }

    DispatchQueue.main.async {
      Reteno.userNotificationService.processRemoteNotificationsToken(tokenValue)
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(setWillPresentNotificationOptions:)
  func setWillPresentNotificationOptions(_ command: CDVInvokedUrlCommand) {
    let arg0 = command.arguments.first
    if arg0 == nil || arg0 is NSNull {
      Reteno.userNotificationService.willPresentNotificationHandler = nil
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      commandDelegate.send(result, callbackId: command.callbackId)
      return
    }

    var optionsPayload: [String] = []
    var emitEvent = false

    if let array = arg0 as? [String] {
      optionsPayload = array
    } else if let dict = arg0 as? [String: Any] {
      if let arr = dict["options"] as? [String] {
        optionsPayload = arr
      } else if let arr = dict["presentationOptions"] as? [String] {
        optionsPayload = arr
      }
      emitEvent = (dict["emitEvent"] as? Bool) ?? false
    } else {
      sendError("Invalid argument: expected array of options or { options, emitEvent }", to: command)
      return
    }

    let presentationOptions = RetenoPlugin.buildPresentationOptions(from: optionsPayload)

    Reteno.userNotificationService.willPresentNotificationHandler = { notification in
      if emitEvent {
        RetenoPlugin.emitJsEvent(
          "reteno-push-received",
          payload: notification.request.content.userInfo
        )
      }
      return presentationOptions
    }

    let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
    commandDelegate.send(result, callbackId: command.callbackId)
  }

  @objc(setDidReceiveNotificationResponseHandler:)
  func setDidReceiveNotificationResponseHandler(_ command: CDVInvokedUrlCommand) {
    let arg0 = command.arguments.first

    var enabled = true
    var emitEvent = false

    if let boolValue = arg0 as? Bool {
      enabled = boolValue
    } else if let dict = arg0 as? [String: Any] {
      if let enabledValue = dict["enabled"] as? Bool {
        enabled = enabledValue
      }
      emitEvent = (dict["emitEvent"] as? Bool) ?? false
    } else if arg0 == nil || arg0 is NSNull {
      enabled = false
    }

    if !enabled {
      Reteno.userNotificationService.didReceiveNotificationResponseHandler = nil
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      commandDelegate.send(result, callbackId: command.callbackId)
      return
    }

    Reteno.userNotificationService.didReceiveNotificationResponseHandler = { response in
      if emitEvent {
        RetenoPlugin.emitJsEvent(
          "reteno-notification-clicked",
          payload: response.notification.request.content.userInfo
        )
      }
    }

    let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
    commandDelegate.send(result, callbackId: command.callbackId)
  }

  private func getPreference(_ key: String) -> String? {
    if let value = commandDelegate.settings[key] as? String { return value }
    let lower = key.lowercased()
    if let value = commandDelegate.settings[lower] as? String { return value }
    let upper = key.uppercased()
    if let value = commandDelegate.settings[upper] as? String { return value }
    return nil
  }

  private func sendError(_ message: String, to command: CDVInvokedUrlCommand) {
    let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: message)
    commandDelegate.send(result, callbackId: command.callbackId)
  }

  private static func buildPresentationOptions(from options: [String]) -> UNNotificationPresentationOptions {
    var result: UNNotificationPresentationOptions = []
    for option in options {
      switch option.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
      case "badge":
        result.insert(.badge)
      case "sound":
        result.insert(.sound)
      case "alert":
        if #available(iOS 14.0, *) {
          result.insert(.banner)
        } else {
          result.insert(.alert)
        }
      case "banner":
        if #available(iOS 14.0, *) {
          result.insert(.banner)
        } else {
          result.insert(.alert)
        }
      case "list":
        if #available(iOS 14.0, *) {
          result.insert(.list)
        } else {
          result.insert(.alert)
        }
      default:
        continue
      }
    }
    return result
  }

  private static let isoFormatter = ISO8601DateFormatter()

  private static func emitJsEvent(_ eventName: String, payload: [AnyHashable: Any]?) {
    guard let instance = activeInstance, instance.webView != nil else { return }

    let safePayload = normalizeForJson(payload ?? [:])
    guard let payloadData = try? JSONSerialization.data(withJSONObject: safePayload, options: []),
          let payloadJson = String(data: payloadData, encoding: .utf8) else {
      return
    }

    guard let eventData = try? JSONSerialization.data(withJSONObject: [eventName], options: []),
          let eventArrayJson = String(data: eventData, encoding: .utf8) else {
      return
    }

    let quotedEventName = String(eventArrayJson.dropFirst().dropLast())
    let js = "cordova.fireDocumentEvent(\(quotedEventName), \(payloadJson));"

    instance.commandDelegate.evalJs(js)
  }

  private static func normalizeForJson(_ value: Any) -> Any {
    switch value {
    case let dict as [AnyHashable: Any]:
      var result: [String: Any] = [:]
      for (key, rawValue) in dict {
        let keyString = String(describing: key)
        result[keyString] = normalizeForJson(rawValue)
      }
      return result
    case let array as [Any]:
      return array.map { normalizeForJson($0) }
    case let string as String:
      return string
    case let number as NSNumber:
      return number
    case let date as Date:
      return isoFormatter.string(from: date)
    case let data as Data:
      return data.base64EncodedString()
    case _ as NSNull:
      return NSNull()
    default:
      return String(describing: value)
    }
  }
}
