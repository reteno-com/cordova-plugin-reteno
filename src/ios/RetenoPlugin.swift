import Foundation
import Reteno
import SwiftUI
import UserNotifications
import Reteno
import Sentry

@objc(RetenoPlugin) class RetenoPlugin : CDVPlugin {
    var retenoStarted = false
    
    override func pluginInitialize() {
       
    }
    
  @objc(setApiKey:)
  func setApiKey(command: CDVInvokedUrlCommand) {
      
    var pluginResult = CDVPluginResult(
      status: CDVCommandStatus_ERROR	
    )
    let key = command.arguments[0] as? String ?? ""
      if (!retenoStarted){
          Reteno.start(apiKey: key, isDebugMode: true)
          Reteno.userNotificationService.registerForRemoteNotifications()
          retenoStarted = true
      }
      pluginResult = CDVPluginResult(
        status: CDVCommandStatus_OK,
        messageAs: key
      )
    self.commandDelegate!.send(
      pluginResult,
      callbackId: command.callbackId
    )
  }

  @objc(logEvent:)
  func logEvent(command: CDVInvokedUrlCommand) {
      var pluginResult = CDVPluginResult(
        status: CDVCommandStatus_ERROR
      );
    self.commandDelegate.run(inBackground: { [self] in
        pluginResult = logEventAsync(command: command)
    })

    self.commandDelegate!.send(
      pluginResult,
      callbackId: command.callbackId
    )
  }
    
    func logEventAsync(command: CDVInvokedUrlCommand) -> CDVPluginResult{
        var pluginResult = CDVPluginResult(
          status: CDVCommandStatus_ERROR
        )
        let payload = command.arguments[0] as? NSDictionary ?? NSDictionary()
          var res = true;
        do {
                let requestPayload = try RetenoEvent.buildEventPayload(payload: payload);
                Reteno.logEvent(
                    eventTypeKey: requestPayload.eventName,
                    date: requestPayload.date,
                    parameters: requestPayload.parameters,
                    forcePush: requestPayload.forcePush
                );
            } catch {
                 pluginResult = CDVPluginResult(
                    status: CDVCommandStatus_OK,
                    messageAs: error.localizedDescription
                )
                res = false;
            }

          if (res){
              pluginResult = CDVPluginResult(
                status: CDVCommandStatus_OK
              )
          }
        return pluginResult ?? CDVPluginResult(status: CDVCommandStatus_ERROR);
    }

  
  @objc(setUserAttributes:)
  func setUserAttributes(command: CDVInvokedUrlCommand) {
      var pluginResult = CDVPluginResult(
        status: CDVCommandStatus_ERROR
      );
      self.commandDelegate.run(inBackground: { [self] in
          pluginResult = setUserAttributesAsync(command: command)
      })
      
      self.commandDelegate!.send(
        pluginResult,
        callbackId: command.callbackId
      )
  }
    
    func setUserAttributesAsync(command: CDVInvokedUrlCommand) -> CDVPluginResult{
      var pluginResult = CDVPluginResult(
        status: CDVCommandStatus_ERROR
      )
      let payload = command.arguments[0] as? NSDictionary ?? NSDictionary()
     
      let externalUserId = payload["externalUserId"] as? String;
      var res = true;
          
          do {
              let requestPayload = try RetenoUserAttributes.buildSetUserAttributesPayload(payload: payload);
              Reteno.updateUserAttributes(
                  externalUserId: externalUserId,
                  userAttributes: requestPayload.userAttributes,
                  subscriptionKeys: requestPayload.subscriptionKeys,
                  groupNamesInclude: requestPayload.groupNamesInclude,
                  groupNamesExclude: requestPayload.groupNamesExclude
              );
              
          } catch {
               pluginResult = CDVPluginResult(
                  status: CDVCommandStatus_OK,
                  messageAs: error.localizedDescription
              )
              res = false;
          }

        if (res){
            pluginResult = CDVPluginResult(
              status: CDVCommandStatus_OK
            )
        }
        self.commandDelegate!.send(
          pluginResult,
          callbackId: command.callbackId
        )
        return pluginResult ?? CDVPluginResult(status: CDVCommandStatus_ERROR);
    }

    @objc(setAnonymousUserAttributes:)
    func setAnonymousUserAttributes(command: CDVInvokedUrlCommand) {
        var pluginResult = CDVPluginResult(
          status: CDVCommandStatus_ERROR
        );
        self.commandDelegate.run(inBackground: { [self] in
            pluginResult = setAnonymousUserAttributesAsync(command: command)
        })
        
        self.commandDelegate!.send(
          pluginResult,
          callbackId: command.callbackId
        )
    }
    
    
    func setAnonymousUserAttributesAsync(command: CDVInvokedUrlCommand) -> CDVPluginResult{
      var pluginResult = CDVPluginResult(
        status: CDVCommandStatus_ERROR
      )
      let payload = command.arguments[0] as? NSDictionary ?? NSDictionary()
     
      var res = true;
          
          do {
              let userAttributes = try RetenoUserAttributes.buildAnonymousUserAttributesPayload(payload: payload);
              Reteno.updateAnonymousUserAttributes(userAttributes: userAttributes);
              
          } catch {
               pluginResult = CDVPluginResult(
                  status: CDVCommandStatus_OK,
                  messageAs: error.localizedDescription
              )
              res = false;
          }

        if (res){
            pluginResult = CDVPluginResult(
              status: CDVCommandStatus_OK
            )
        }
        self.commandDelegate!.send(
          pluginResult,
          callbackId: command.callbackId
        )
        return pluginResult ?? CDVPluginResult(status: CDVCommandStatus_ERROR);
    }

  @objc(getInitialNotification:)
  func getInitialNotification(command: CDVInvokedUrlCommand) {
    let pluginResult = CDVPluginResult(
      status: CDVCommandStatus_ERROR
    )

    self.commandDelegate!.send(
      pluginResult,
      callbackId: command.callbackId
    )
  }
    
    @objc(performRemoteToken:)
    func performRemoteToken(command: CDVInvokedUrlCommand) {
      let pluginResult = CDVPluginResult(
        status: CDVCommandStatus_ERROR
      )
        let fcmToken = command.arguments[0] as? String ?? ""
        Reteno.userNotificationService.processRemoteNotificationsToken(fcmToken);
      self.commandDelegate!.send(
        pluginResult,
        callbackId: command.callbackId
      )
    }

  @objc(setOnRetenoPushReceivedListener:)
  func setOnRetenoPushReceivedListener(command: CDVInvokedUrlCommand) {
    let pluginResult = CDVPluginResult(
      status: CDVCommandStatus_ERROR
    )
      
    self.commandDelegate!.send(
      pluginResult,
      callbackId: command.callbackId
    )
  }    
}
