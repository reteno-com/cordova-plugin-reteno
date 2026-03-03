import Foundation
import UIKit
import UserNotifications
import Reteno

@objc(RetenoPlugin)
class RetenoPlugin: CDVPlugin {
  private static weak var activeInstance: RetenoPlugin?
  private var inboxCountCallbackId: String?

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

    let pauseInAppMessages = (options["pauseInAppMessages"] as? Bool) ?? false
    let lifecycleOptions = parseLifecycleTrackingOptions(options["lifecycleTrackingOptions"])
    let lifecycleAppEnabled = lifecycleOptions?.appLifecycleEnabled ?? true
    let lifecyclePushEnabled = lifecycleOptions?.pushSubscriptionEnabled ?? true
    let lifecycleSessionEnabled = lifecycleOptions?.sessionEventsEnabled ?? true
    let screenReportingEnabled = (options["isAutomaticScreenReportingEnabled"] as? Bool) ?? false
    let isDebugMode = (options["isDebugMode"] as? Bool) ?? false

    let configuration = RetenoConfiguration(
      isAutomaticScreenReportingEnabled: screenReportingEnabled,
      isAutomaticAppLifecycleReportingEnabled: lifecycleAppEnabled,
      isAutomaticPushSubsriptionReportingEnabled: lifecyclePushEnabled,
      isAutomaticSessionReportingEnabled: lifecycleSessionEnabled,
      isPausedInAppMessages: pauseInAppMessages,
      isDebugMode: isDebugMode
    )

    DispatchQueue.main.async {
      Reteno.start(apiKey: apiKey, configuration: configuration)

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

  @objc(logEvent:)
  func logEvent(_ command: CDVInvokedUrlCommand) {
    guard let payload = extractPayload(from: command) else {
      sendError("Missing argument: payload", to: command)
      return
    }

    guard let eventName = stringValue(payload["eventName"]) else {
      sendError("logEvent: missing 'eventName' parameter!", to: command)
      return
    }

    let dateValue = payload["date"]
    let eventDate: Date
    if dateValue == nil || dateValue is NSNull {
      eventDate = Date()
    } else if let dateString = stringValue(dateValue), let parsedDate = parseIso8601Date(dateString) {
      eventDate = parsedDate
    } else {
      sendError("Invalid argument: date. Expected ISO8601 string.", to: command)
      return
    }

    let parameters = buildEventParameters(from: payload["parameters"])
    let forcePush = (payload["forcePush"] as? Bool) ?? false

    DispatchQueue.main.async {
      Reteno.logEvent(
        eventTypeKey: eventName,
        date: eventDate,
        parameters: parameters,
        forcePush: forcePush
      )
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(logScreenView:)
  func logScreenView(_ command: CDVInvokedUrlCommand) {
    let arg0 = command.arguments.first
    var screenName: String?

    if let value = arg0 as? String {
      screenName = value
    } else if let payload = dictionaryValue(arg0) {
      screenName = payload["screenName"] as? String
    } else if let array = arg0 as? [Any], let first = array.first {
      if let value = first as? String {
        screenName = value
      } else if let payload = dictionaryValue(first) {
        screenName = payload["screenName"] as? String
      }
    }

    guard let resolvedScreenName = stringValue(screenName) else {
      sendError("Missing argument: screenName", to: command)
      return
    }

    DispatchQueue.main.async {
      Reteno.logEvent(
        eventTypeKey: "screenView",
        parameters: [Event.Parameter(name: "screenClass", value: resolvedScreenName)]
      )
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(setLifecycleTrackingOptions:)
  func setLifecycleTrackingOptions(_ command: CDVInvokedUrlCommand) {
    sendError(
      "setLifecycleTrackingOptions is not supported on iOS after initialization. Configure lifecycleTrackingOptions in init(...).",
      to: command
    )
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

  @objc(setUserAttributes:)
  func setUserAttributes(_ command: CDVInvokedUrlCommand) {
    guard let payload = extractPayload(from: command) else {
      sendError("Invalid setUserAttributes payload.", to: command)
      return
    }

    guard let externalUserId = stringValue(payload["externalUserId"]) else {
      sendError("Missing argument: externalUserId", to: command)
      return
    }

    let userDict = dictionaryValue(payload["user"])
    let userAttributes = buildUserAttributes(from: dictionaryValue(userDict?["userAttributes"]))
    let subscriptionKeys = stringArrayValue(userDict?["subscriptionKeys"])
    let groupNamesInclude = stringArrayValue(userDict?["groupNamesInclude"])
    let groupNamesExclude = stringArrayValue(userDict?["groupNamesExclude"])

    DispatchQueue.main.async {
      Reteno.updateUserAttributes(
        externalUserId: externalUserId,
        userAttributes: userAttributes,
        subscriptionKeys: subscriptionKeys,
        groupNamesInclude: groupNamesInclude,
        groupNamesExclude: groupNamesExclude
      )
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(setAnonymousUserAttributes:)
  func setAnonymousUserAttributes(_ command: CDVInvokedUrlCommand) {
    guard let payload = extractPayload(from: command) else {
      sendError("Invalid setAnonymousUserAttributes payload.", to: command)
      return
    }

    let nestedAttributes = dictionaryValue(payload["userAttributes"])
    if hasPhoneOrEmail(payload) || hasPhoneOrEmail(nestedAttributes) {
      sendError(
        "Anonymous user attributes cannot include phone/email. Use setUserAttributes(externalUserId, user) instead.",
        to: command
      )
      return
    }

    let attributesSource = nestedAttributes ?? payload
    let anonymousAttributes = buildAnonymousUserAttributes(from: attributesSource)
    let subscriptionKeys = stringArrayValue(payload["subscriptionKeys"])
    let groupNamesInclude = stringArrayValue(payload["groupNamesInclude"])
    let groupNamesExclude = stringArrayValue(payload["groupNamesExclude"])

    DispatchQueue.main.async {
      Reteno.updateAnonymousUserAttributes(
        userAttributes: anonymousAttributes,
        subscriptionKeys: subscriptionKeys,
        groupNamesInclude: groupNamesInclude,
        groupNamesExclude: groupNamesExclude
      )
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
  }

  @objc(setMultiAccountUserAttributes:)
  func setMultiAccountUserAttributes(_ command: CDVInvokedUrlCommand) {
    guard let payload = extractPayload(from: command) else {
      sendError("Invalid setMultiAccountUserAttributes payload.", to: command)
      return
    }

    guard let externalUserId = stringValue(payload["externalUserId"]) else {
      sendError("Missing argument: externalUserId", to: command)
      return
    }

    guard let userDict = dictionaryValue(payload["user"]) else {
      sendError("Missing argument: user", to: command)
      return
    }

    let userAttributes = buildUserAttributes(from: dictionaryValue(userDict["userAttributes"]))
    let subscriptionKeys = stringArrayValue(userDict["subscriptionKeys"])
    let groupNamesInclude = stringArrayValue(userDict["groupNamesInclude"])
    let groupNamesExclude = stringArrayValue(userDict["groupNamesExclude"])

    DispatchQueue.main.async {
      Reteno.updateMultiAccountUserAttributes(
        externalUserId: externalUserId,
        userAttributes: userAttributes,
        subscriptionKeys: subscriptionKeys,
        groupNamesInclude: groupNamesInclude,
        groupNamesExclude: groupNamesExclude,
        accountSuffix: externalUserId
      )
      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      self.commandDelegate.send(result, callbackId: command.callbackId)
    }
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

  // MARK: - App Inbox

  @objc(getAppInboxMessages:)
  func getAppInboxMessages(_ command: CDVInvokedUrlCommand) {
    let payload = extractPayload(from: command) ?? [:]

    let page: Int? = {
      if let n = payload["page"] as? Int { return n }
      if let n = payload["page"] as? NSNumber { return n.intValue }
      if let s = payload["page"] as? String, let n = Int(s) { return n }
      return nil
    }()

    let pageSize: Int? = {
      if let n = payload["pageSize"] as? Int { return n }
      if let n = payload["pageSize"] as? NSNumber { return n.intValue }
      if let s = payload["pageSize"] as? String, let n = Int(s) { return n }
      return nil
    }()

    let status: AppInboxMessagesStatus? = {
      guard let raw = stringValue(payload["status"]) else { return nil }
      switch raw.uppercased() {
      case "OPENED": return .opened
      case "UNOPENED": return .unopened
      default: return nil
      }
    }()

    Reteno.inbox().downloadMessages(page: page, pageSize: pageSize, status: status) { [weak self] result in
      guard let self = self else { return }
      switch result {
      case .success(let response):
        let messagesJson = response.messages.map { self.inboxMessageToDict($0) }
        let responseDict: [String: Any] = [
          "messages": messagesJson,
          "totalPages": response.totalPages ?? 0
        ]
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: responseDict)
        self.commandDelegate.send(pluginResult, callbackId: command.callbackId)
      case .failure(let error):
        self.sendError("getAppInboxMessages: \(error.localizedDescription)", to: command)
      }
    }
  }

  @objc(getAppInboxMessagesCount:)
  func getAppInboxMessagesCount(_ command: CDVInvokedUrlCommand) {
    Reteno.inbox().getUnreadMessagesCount { [weak self] result in
      guard let self = self else { return }
      switch result {
      case .success(let count):
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: count)
        self.commandDelegate.send(pluginResult, callbackId: command.callbackId)
      case .failure(let error):
        self.sendError("getAppInboxMessagesCount: \(error.localizedDescription)", to: command)
      }
    }
  }

  @objc(subscribeOnMessagesCountChanged:)
  func subscribeOnMessagesCountChanged(_ command: CDVInvokedUrlCommand) {
    inboxCountCallbackId = command.callbackId
    setupInboxCountSubscription()

    // Send NO_RESULT immediately to keep the callback alive
    let noResult = CDVPluginResult(status: CDVCommandStatus_NO_RESULT)
    noResult?.setKeepCallbackAs(true)
    commandDelegate.send(noResult, callbackId: command.callbackId)
  }

  @objc(unsubscribeMessagesCountChanged:)
  func unsubscribeMessagesCountChanged(_ command: CDVInvokedUrlCommand) {
    Reteno.inbox().onUnreadMessagesCountChanged = nil
    inboxCountCallbackId = nil

    let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
    commandDelegate.send(result, callbackId: command.callbackId)
  }

  /// Helper: wires up the `onUnreadMessagesCountChanged` handler that forwards
  /// every count update to the stored `inboxCountCallbackId` callback.
  private func setupInboxCountSubscription() {
    Reteno.inbox().onUnreadMessagesCountChanged = { [weak self] count in
      guard let self = self, let callbackId = self.inboxCountCallbackId else { return }
      let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: count)
      pluginResult?.setKeepCallbackAs(true)
      self.commandDelegate.send(pluginResult, callbackId: callbackId)
    }
  }

  @objc(markAsOpened:)
  func markAsOpened(_ command: CDVInvokedUrlCommand) {
    let arg0 = command.arguments.first
    var messageIds: [String] = []

    if let messageId = arg0 as? String, !messageId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      messageIds = [messageId.trimmingCharacters(in: .whitespacesAndNewlines)]
    } else if let payload = arg0 as? [String: Any] {
      if let id = payload["messageId"] as? String {
        messageIds = [id.trimmingCharacters(in: .whitespacesAndNewlines)]
      } else if let id = payload["id"] as? String {
        messageIds = [id.trimmingCharacters(in: .whitespacesAndNewlines)]
      } else if let ids = payload["messageIds"] as? [String] {
        messageIds = ids.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
      }
    } else if let ids = arg0 as? [String] {
      messageIds = ids.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }

    guard !messageIds.isEmpty else {
      sendError("Missing argument: messageId", to: command)
      return
    }

    Reteno.inbox().markAsOpened(messageIds: messageIds) { [weak self] result in
      guard let self = self else { return }
      switch result {
      case .success:
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
        self.commandDelegate.send(pluginResult, callbackId: command.callbackId)
      case .failure(let error):
        self.sendError("markAsOpened: \(error.localizedDescription)", to: command)
      }
    }
  }

  @objc(markAllMessagesAsOpened:)
  func markAllMessagesAsOpened(_ command: CDVInvokedUrlCommand) {
    Reteno.inbox().markAllAsOpened { [weak self] result in
      guard let self = self else { return }
      switch result {
      case .success:
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
        self.commandDelegate.send(pluginResult, callbackId: command.callbackId)
      case .failure(let error):
        self.sendError("markAllMessagesAsOpened: \(error.localizedDescription)", to: command)
      }
    }
  }

  private func inboxMessageToDict(_ message: AppInboxMessage) -> [String: Any] {
    var dict: [String: Any] = [
      "id": message.id,
      "title": message.title,
      "createdDate": message.createdDate.map { RetenoPlugin.isoFormatterWithMs.string(from: $0) } ?? "",
      "isNewMessage": message.isNew,
      "content": message.content ?? NSNull(),
      "imageUrl": message.imageURL?.absoluteString ?? NSNull(),
      "linkUrl": message.linkURL?.absoluteString ?? NSNull(),
      "category": message.category ?? NSNull(),
    ]

    // Map isNew to status for cross-platform consistency with Android
    dict["status"] = message.isNew ? "UNOPENED" : "OPENED"

    // customData: [String: Any]? — serialize to JSON-safe dictionary
    if let customData = message.customData {
      dict["customData"] = RetenoPlugin.normalizeForJson(customData)
    } else {
      dict["customData"] = NSNull()
    }

    return dict
  }

  // MARK: - Recommendations

  @objc(getRecommendations:)
  func getRecommendations(_ command: CDVInvokedUrlCommand) {
    let payload = extractPayload(from: command) ?? [:]

    guard let recomVariantId = stringValue(payload["recomVariantId"]),
          !recomVariantId.isEmpty else {
      sendError("Missing argument: recomVariantId", to: command)
      return
    }

    let productIds: [String] = stringArrayValue(payload["productIds"])
    let categoryId: String? = stringValue(payload["categoryId"])

    let fields: [String]? = {
      if payload["fields"] == nil || payload["fields"] is NSNull { return nil }
      return stringArrayValue(payload["fields"])
    }()

    let filters: [RecomFilter]? = {
      guard let raw = payload["filters"] else { return nil }
      if raw is NSNull { return nil }

      // Single filter object
      if let dict = raw as? [String: Any] {
        if let filter = self.parseRecomFilter(dict) {
          return [filter]
        }
        return nil
      }
      // Array of filter objects
      if let array = raw as? [[String: Any]] {
        var result: [RecomFilter] = []
        for dict in array {
          if let filter = self.parseRecomFilter(dict) {
            result.append(filter)
          }
        }
        return result.isEmpty ? nil : result
      }
      return nil
    }()

    Reteno.recommendations().getRecomJSONs(
      recomVariantId: recomVariantId,
      productIds: productIds,
      categoryId: categoryId,
      filters: filters,
      fields: fields
    ) { [weak self] (result: Result<[[String: Any]], Error>) in
      guard let self = self else { return }
      switch result {
      case .success(let recomsJson):
        let responseDict: [String: Any] = ["recoms": recomsJson]
        let pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: responseDict)
        self.commandDelegate.send(pluginResult, callbackId: command.callbackId)
      case .failure(let error):
        self.sendError("getRecommendations: \(error.localizedDescription)", to: command)
      }
    }
  }

  @objc(logRecommendations:)
  func logRecommendations(_ command: CDVInvokedUrlCommand) {
    let payload = extractPayload(from: command) ?? [:]

    guard let recomVariantId = stringValue(payload["recomVariantId"]),
          !recomVariantId.isEmpty else {
      sendError("Missing argument: recomVariantId", to: command)
      return
    }

    guard let rawEvents = payload["recomEvents"] as? [[String: Any]], !rawEvents.isEmpty else {
      sendError("Missing argument: recomEvents", to: command)
      return
    }

    var impressions: [RecomEvent] = []
    var clicks: [RecomEvent] = []

    for rawEvent in rawEvents {
      guard let productId = stringValue(rawEvent["productId"]),
            !productId.isEmpty else {
        sendError("Invalid recomEvent: missing productId", to: command)
        return
      }

      let date: Date = {
        if let raw = rawEvent["occurred"] {
          if let str = stringValue(raw), let parsed = parseIso8601Date(str) {
            return parsed
          }
          if let num = raw as? NSNumber {
            return Date(timeIntervalSince1970: num.doubleValue / 1000.0)
          }
        }
        return Date()
      }()

      let event = RecomEvent(date: date, productId: productId)

      let eventType = stringValue(rawEvent["recomEventType"])?.uppercased() ?? "IMPRESSIONS"
      if eventType == "CLICKS" {
        clicks.append(event)
      } else {
        impressions.append(event)
      }
    }

    Reteno.recommendations().logEvent(
      recomVariantId: recomVariantId,
      impressions: impressions,
      clicks: clicks
    )

    let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
    commandDelegate.send(result, callbackId: command.callbackId)
  }

  private func parseRecomFilter(_ dict: [String: Any]) -> RecomFilter? {
    guard let name = stringValue(dict["name"]), !name.isEmpty else { return nil }
    let values = stringArrayValue(dict["values"])
    guard !values.isEmpty else { return nil }
    return RecomFilter(name: name, values: values)
  }

  // MARK: - Ecommerce

  @objc(logEcommerceEvent:)
  func logEcommerceEvent(_ command: CDVInvokedUrlCommand) {
    guard let payload = extractPayload(from: command) else {
      sendError("Missing argument: payload", to: command)
      return
    }

    guard let rawType = stringValue(payload["eventType"]) ?? stringValue(payload["type"]),
          !rawType.isEmpty else {
      sendError("Missing argument: eventType", to: command)
      return
    }

    let eventType = rawType.lowercased().filter { $0.isLetter || $0.isNumber }
    let forcePush = (payload["forcePush"] as? Bool) ?? false

    let occurred: Date = {
      if let raw = payload["occurred"] {
        if let str = stringValue(raw), let parsed = parseIso8601Date(str) { return parsed }
        if let num = raw as? NSNumber { return Date(timeIntervalSince1970: num.doubleValue / 1000.0) }
      }
      return Date()
    }()

    let currencyCode = stringValue(payload["currencyCode"])

    do {
      let ecomEventType: Ecommerce.EventType

      switch eventType {
      case "productviewed":
        let product = try parseEcomProduct(payload["product"])
        ecomEventType = .productViewed(product: product, currencyCode: currencyCode)

      case "productcategoryviewed":
        let category = try parseEcomProductCategory(payload["category"])
        ecomEventType = .productCategoryViewed(category: category)

      case "productaddedtowishlist":
        let product = try parseEcomProduct(payload["product"])
        ecomEventType = .productAddedToWishlist(product: product, currencyCode: currencyCode)

      case "cartupdated":
        guard let cartId = stringValue(payload["cartId"]), !cartId.isEmpty else {
          sendError("Missing argument: cartId", to: command)
          return
        }
        let products = try parseEcomProductsInCart(payload["products"])
        ecomEventType = .cartUpdated(cartId: cartId, products: products, currencyCode: currencyCode)

      case "ordercreated":
        let order = try parseEcomOrder(payload["order"])
        ecomEventType = .orderCreated(order: order, currencyCode: currencyCode)

      case "orderupdated":
        let order = try parseEcomOrder(payload["order"])
        ecomEventType = .orderUpdated(order: order, currencyCode: currencyCode)

      case "orderdelivered":
        guard let externalOrderId = stringValue(payload["externalOrderId"]), !externalOrderId.isEmpty else {
          sendError("Missing argument: externalOrderId", to: command)
          return
        }
        ecomEventType = .orderDelivered(externalOrderId: externalOrderId)

      case "ordercancelled":
        guard let externalOrderId = stringValue(payload["externalOrderId"]), !externalOrderId.isEmpty else {
          sendError("Missing argument: externalOrderId", to: command)
          return
        }
        ecomEventType = .orderCancelled(externalOrderId: externalOrderId)

      case "searchrequest":
        guard let query = stringValue(payload["search"]), !query.isEmpty else {
          sendError("Missing argument: search", to: command)
          return
        }
        let isFound = parseBoolLenient(payload["isFound"])
        ecomEventType = .searchRequest(query: query, isFound: isFound)

      default:
        sendError("Invalid argument: eventType '\(rawType)'", to: command)
        return
      }

      Reteno.ecommerce().logEvent(type: ecomEventType, date: occurred, forcePush: forcePush)

      let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: 1)
      commandDelegate.send(result, callbackId: command.callbackId)
    } catch {
      sendError("logEcommerceEvent: \(error.localizedDescription)", to: command)
    }
  }

  // MARK: - Ecommerce parsers

  private func parseEcomProduct(_ value: Any?) throws -> Ecommerce.Product {
    guard let dict = dictionaryValue(value) else {
      throw EcomParseError("Missing argument: product")
    }
    guard let productId = stringValue(dict["productId"]), !productId.isEmpty else {
      throw EcomParseError("Missing argument: productId")
    }
    guard let price = parseDoubleLenient(dict["price"]) else {
      throw EcomParseError("Missing argument: price")
    }
    guard let isInStock = parseBoolLenient(dict["isInStock"]) else {
      throw EcomParseError("Missing argument: isInStock")
    }
    let attributes = parseEcomAttributes(dict["attributes"])
    return Ecommerce.Product(
      productId: productId,
      price: Float(price),
      isInStock: isInStock,
      attributes: attributes
    )
  }

  private func parseEcomProductCategory(_ value: Any?) throws -> Ecommerce.ProductCategory {
    guard let dict = dictionaryValue(value) else {
      throw EcomParseError("Missing argument: category")
    }
    guard let productCategoryId = stringValue(dict["productCategoryId"]), !productCategoryId.isEmpty else {
      throw EcomParseError("Missing argument: productCategoryId")
    }
    let attributes = parseEcomAttributes(dict["attributes"])
    return Ecommerce.ProductCategory(
      productCategoryId: productCategoryId,
      attributes: attributes
    )
  }

  private func parseEcomProductsInCart(_ value: Any?) throws -> [Ecommerce.ProductInCart] {
    guard let array = value as? [[String: Any]], !array.isEmpty else {
      throw EcomParseError("Missing argument: products")
    }
    return try array.map { dict in
      guard let productId = stringValue(dict["productId"]), !productId.isEmpty else {
        throw EcomParseError("Missing argument: productId")
      }
      guard let price = parseDoubleLenient(dict["price"]) else {
        throw EcomParseError("Missing argument: price")
      }
      guard let quantity = parseIntLenient(dict["quantity"]) else {
        throw EcomParseError("Missing argument: quantity")
      }
      let discount = parseDoubleLenient(dict["discount"]).map { Float($0) }
      let name = stringValue(dict["name"])
      let category = stringValue(dict["category"])
      let attributes = parseEcomAttributes(dict["attributes"])
      return Ecommerce.ProductInCart(
        productId: productId,
        price: Float(price),
        quantity: quantity,
        discount: discount,
        name: name,
        category: category,
        attributes: attributes
      )
    }
  }

  private func parseEcomOrder(_ value: Any?) throws -> Ecommerce.Order {
    guard let dict = dictionaryValue(value) else {
      throw EcomParseError("Missing argument: order")
    }
    guard let externalOrderId = stringValue(dict["externalOrderId"]), !externalOrderId.isEmpty else {
      throw EcomParseError("Missing argument: externalOrderId")
    }
    guard let totalCost = parseDoubleLenient(dict["totalCost"]) else {
      throw EcomParseError("Missing argument: totalCost")
    }
    guard let status = parseEcomOrderStatus(dict["status"]) else {
      throw EcomParseError("Missing argument: status")
    }

    let orderDate: Date = {
      if let raw = dict["date"] {
        if let str = stringValue(raw), let parsed = parseIso8601Date(str) { return parsed }
        if let num = raw as? NSNumber { return Date(timeIntervalSince1970: num.doubleValue / 1000.0) }
      }
      return Date()
    }()

    let cartId = stringValue(dict["cartId"])
    let email = stringValue(dict["email"])
    let phone = stringValue(dict["phone"])
    let firstName = stringValue(dict["firstName"])
    let lastName = stringValue(dict["lastName"])
    let shipping = parseDoubleLenient(dict["shipping"]).map { Float($0) }
    let discount = parseDoubleLenient(dict["discount"]).map { Float($0) }
    let taxes = parseDoubleLenient(dict["taxes"]).map { Float($0) }
    let restoreUrl = stringValue(dict["restoreUrl"])
    let statusDescription = stringValue(dict["statusDescription"])
    let storeId = stringValue(dict["storeId"])
    let source = stringValue(dict["source"])
    let deliveryMethod = stringValue(dict["deliveryMethod"])
    let paymentMethod = stringValue(dict["paymentMethod"])
    let deliveryAddress = stringValue(dict["deliveryAddress"])
    let items = parseEcomOrderItems(dict["items"])
    let attributes = parseEcomOrderAttributes(dict["attributes"])

    return Ecommerce.Order(
      externalOrderId: externalOrderId,
      totalCost: Float(totalCost),
      status: status,
      date: orderDate,
      cartId: cartId,
      email: email,
      phone: phone,
      firstName: firstName,
      lastName: lastName,
      shipping: shipping,
      discount: discount,
      taxes: taxes,
      restoreUrl: restoreUrl,
      statusDescription: statusDescription,
      storeId: storeId,
      source: source,
      deliveryMethod: deliveryMethod,
      paymentMethod: paymentMethod,
      deliveryAddress: deliveryAddress,
      items: items,
      attributes: attributes
    )
  }

  private func parseEcomOrderItems(_ value: Any?) -> [Ecommerce.Order.Item]? {
    guard let array = value as? [[String: Any]], !array.isEmpty else { return nil }
    return array.compactMap { dict -> Ecommerce.Order.Item? in
      guard let externalItemId = stringValue(dict["externalItemId"]),
            let name = stringValue(dict["name"]),
            let category = stringValue(dict["category"]),
            let quantity = parseDoubleLenient(dict["quantity"]),
            let cost = parseDoubleLenient(dict["cost"]),
            let url = stringValue(dict["url"]) else {
        return nil
      }
      let imageUrl = stringValue(dict["imageUrl"])
      let description = stringValue(dict["description"])
      return Ecommerce.Order.Item(
        externalItemId: externalItemId,
        name: name,
        category: category,
        quantity: quantity,
        cost: Float(cost),
        url: url,
        imageUrl: imageUrl,
        description: description
      )
    }
  }

  private func parseEcomOrderStatus(_ value: Any?) -> Ecommerce.Order.Status? {
    guard let raw = stringValue(value) else { return nil }
    switch raw.uppercased() {
    case "DELIVERED": return .DELIVERED
    case "IN_PROGRESS": return .IN_PROGRESS
    case "CANCELLED": return .CANCELLED
    case "INITIALIZED": return .INITIALIZED
    default: return nil
    }
  }

  /// Converts JS `[{name: "size", value: ["M","L"]}, ...]` to iOS SDK `["size": ["M","L"], ...]`
  private func parseEcomAttributes(_ value: Any?) -> [String: [String]]? {
    // Already in dictionary form (from iOS native callers or certain JS shapes)
    if let dict = value as? [String: [String]] { return dict }
    if let dict = value as? [String: Any] {
      var result: [String: [String]] = [:]
      for (key, val) in dict {
        if let arr = val as? [String] { result[key] = arr }
        else if let str = val as? String { result[key] = [str] }
      }
      return result.isEmpty ? nil : result
    }
    // Array of {name, value} objects (Cordova JS convention, matching Android)
    guard let array = value as? [[String: Any]] else { return nil }
    var result: [String: [String]] = [:]
    for item in array {
      guard let name = stringValue(item["name"]) else { continue }
      if let values = item["value"] as? [String] {
        result[name] = values
      } else if let singleValue = stringValue(item["value"]) {
        result[name] = [singleValue]
      }
    }
    return result.isEmpty ? nil : result
  }

  /// Parses Order-level attributes: `[String: [String: Any]]?`
  /// Accepts either a JS object like `{"key1": {"a": 1}, "key2": {"b": "x"}}` directly,
  /// or nil/NSNull.
  private func parseEcomOrderAttributes(_ value: Any?) -> [String: [String: Any]]? {
    guard let dict = value as? [String: Any], !dict.isEmpty else { return nil }
    var result: [String: [String: Any]] = [:]
    for (key, val) in dict {
      if let innerDict = val as? [String: Any] {
        result[key] = innerDict
      }
    }
    return result.isEmpty ? nil : result
  }

  private func parseDoubleLenient(_ value: Any?) -> Double? {
    if let n = value as? Double { return n }
    if let n = value as? NSNumber { return n.doubleValue }
    if let n = value as? Int { return Double(n) }
    if let s = value as? String, let d = Double(s) { return d }
    return nil
  }

  private func parseIntLenient(_ value: Any?) -> Int? {
    if let n = value as? Int { return n }
    if let n = value as? NSNumber { return n.intValue }
    if let s = value as? String, let i = Int(s) { return i }
    if let d = value as? Double { return Int(d) }
    return nil
  }

  private func parseBoolLenient(_ value: Any?) -> Bool? {
    if let b = value as? Bool { return b }
    if let n = value as? NSNumber { return n.boolValue }
    if let s = value as? String {
      let lower = s.lowercased()
      if lower == "true" || lower == "1" || lower == "yes" { return true }
      if lower == "false" || lower == "0" || lower == "no" { return false }
    }
    return nil
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

  private func extractPayload(from command: CDVInvokedUrlCommand) -> [String: Any]? {
    guard let arg0 = command.arguments.first, !(arg0 is NSNull) else { return nil }
    if let dict = dictionaryValue(arg0) { return dict }
    if let array = arg0 as? [Any], let first = array.first, let dict = dictionaryValue(first) {
      return dict
    }
    if let jsonString = arg0 as? String, let data = jsonString.data(using: .utf8) {
      if let object = try? JSONSerialization.jsonObject(with: data, options: []),
         let dict = dictionaryValue(object) {
        return dict
      }
    }
    return nil
  }

  private func dictionaryValue(_ value: Any?) -> [String: Any]? {
    if let dict = value as? [String: Any] { return dict }
    if let dict = value as? NSDictionary { return dict as? [String: Any] }
    return nil
  }

  private func stringValue(_ value: Any?) -> String? {
    guard let raw = value as? String else { return nil }
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }

  private func stringArrayValue(_ value: Any?) -> [String] {
    if let array = value as? [String] {
      return array.compactMap { stringValue($0) }
    }
    if let array = value as? [Any] {
      return array.compactMap { item in
        if let str = item as? String { return stringValue(str) }
        return nil
      }
    }
    return []
  }

  private func parseLifecycleTrackingOptions(_ value: Any?) -> (
    appLifecycleEnabled: Bool,
    pushSubscriptionEnabled: Bool,
    sessionEventsEnabled: Bool
  )? {
    if let raw = stringValue(value) {
      if raw.caseInsensitiveCompare("ALL") == .orderedSame {
        return (true, true, true)
      }
      if raw.caseInsensitiveCompare("NONE") == .orderedSame {
        return (false, false, false)
      }
      return nil
    }

    guard let payload = dictionaryValue(value) else { return nil }
    return (
      appLifecycleEnabled: (payload["appLifecycleEnabled"] as? Bool) ?? true,
      pushSubscriptionEnabled: (payload["pushSubscriptionEnabled"] as? Bool) ?? true,
      sessionEventsEnabled: (payload["sessionEventsEnabled"] as? Bool) ?? true
    )
  }

  private func parseIso8601Date(_ value: String) -> Date? {
    if let parsed = RetenoPlugin.isoFormatterWithMs.date(from: value) { return parsed }
    return RetenoPlugin.isoFormatter.date(from: value)
  }

  private func buildEventParameters(from value: Any?) -> [Event.Parameter] {
    guard let array = value as? [Any] else { return [] }
    var result: [Event.Parameter] = []
    for item in array {
      guard let dict = dictionaryValue(item) else { continue }
      guard let name = stringValue(dict["name"]) else { continue }
      let parameterValue = stringValue(dict["value"]) ?? ""
      result.append(Event.Parameter(name: name, value: parameterValue))
    }
    return result
  }

  private func hasPhoneOrEmail(_ payload: [String: Any]?) -> Bool {
    guard let payload else { return false }
    let phone = stringValue(payload["phone"])
    let email = stringValue(payload["email"])
    return phone != nil || email != nil
  }

  private func buildUserAttributes(from payload: [String: Any]?) -> UserAttributes? {
    guard let payload else { return nil }

    let phone = stringValue(payload["phone"])
    let email = stringValue(payload["email"])
    let firstName = stringValue(payload["firstName"])
    let lastName = stringValue(payload["lastName"])
    let languageCode = stringValue(payload["languageCode"])
    let timeZone = stringValue(payload["timeZone"])
    let address = buildAddress(from: payload["address"])
    let fields = buildCustomFields(from: payload["fields"])

    return UserAttributes(
      phone: phone,
      email: email,
      firstName: firstName,
      lastName: lastName,
      languageCode: languageCode,
      timeZone: timeZone,
      address: address,
      fields: fields
    )
  }

  private func buildAnonymousUserAttributes(from payload: [String: Any]) -> AnonymousUserAttributes {
    let firstName = stringValue(payload["firstName"])
    let lastName = stringValue(payload["lastName"])
    let languageCode = stringValue(payload["languageCode"])
    let timeZone = stringValue(payload["timeZone"])
    let address = buildAddress(from: payload["address"])
    let fields = buildCustomFields(from: payload["fields"])

    return AnonymousUserAttributes(
      firstName: firstName,
      lastName: lastName,
      languageCode: languageCode,
      timeZone: timeZone,
      address: address,
      fields: fields
    )
  }

  private func buildAddress(from value: Any?) -> Address? {
    guard let payload = dictionaryValue(value) else { return nil }
    let region = stringValue(payload["region"])
    let town = stringValue(payload["town"])
    let address = stringValue(payload["address"])
    let postcode = stringValue(payload["postcode"])

    if region == nil && town == nil && address == nil && postcode == nil { return nil }
    return Address(region: region, town: town, address: address, postcode: postcode)
  }

  private func buildCustomFields(from value: Any?) -> [UserCustomField] {
    guard let array = value as? [Any] else { return [] }
    var result: [UserCustomField] = []
    for item in array {
      guard let dict = dictionaryValue(item) else { continue }
      guard let key = stringValue(dict["key"]), let value = stringValue(dict["value"]) else { continue }
      result.append(UserCustomField(key: key, value: value))
    }
    return result
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

  private static let isoFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
  }()

  private static let isoFormatterWithMs: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

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

// MARK: - Ecommerce parse error

private struct EcomParseError: LocalizedError {
  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message }
}
