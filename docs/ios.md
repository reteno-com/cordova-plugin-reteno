## Installation

1. Follow `Step 1` described in iOS SDK setup guide: [link](https://docs.reteno.com/reference/ios#step-1-add-the-notification-service-extension)


2. Modify your cocoapod file to contain next dependencies:
```

target 'NotificationServiceExtension' do
  pod 'Reteno', '1.6.6'
  pod 'Sentry', '8.2.0', :modular_headers => true

end

target 'ExampleCordova' do
  ...
  pod 'Reteno', '1.6.6'
  pod 'Sentry', '8.2.0', :modular_headers => true
end

```

3. In RetenoPlugin.swift start SentrySDK with your parameters
```swift
override func pluginInitialize(){
  ...
  SentrySDK.start { options in
                    options.dsn = "your-url"
                    options.debug = true
                    options.enableAppHangTracking = true
                    options.enableFileIOTracing = true
        }
}

```

4. Install Swift Support plugin [link] (https://www.npmjs.com/package/cordova-plugin-add-swift-support), in case if project is not configured for Swift yet:
```
cordova plugin add cordova-plugin-add-swift-support
```

5. If Reteno Firebase notification should be supported, please apply changes in AppDelegate+FirebasePlugin.m [link] (https://github.com/reteno-com/reteno-cordova/blob/main/cordova-plugin-reteno-firebase/src/ios/AppDelegate%2BFirebasePlugin.m)
   
5.1. import Swift header:
```
#import "<YourProject>-Swift.h"
```

5.2. Uncomment call to RetenoUtil in didReceiveRegistrationToken
```
- (void)messaging:(FIRMessaging *)messaging didReceiveRegistrationToken:(NSString *)fcmToken {
    @try{
        [FirebasePlugin.firebasePlugin _logMessage:[NSString stringWithFormat:@"didReceiveRegistrationToken: %@", fcmToken]];
        [FirebasePlugin.firebasePlugin sendToken:fcmToken];
        RetenoUtils * retenoUtils = [RetenoUtils new];
        [retenoUtils processRemoteNotificationsTokenWithFcmToken:fcmToken];
        
    }@catch (NSException *exception) {
        [FirebasePlugin.firebasePlugin handlePluginExceptionWithoutContext:exception];
    }
}
```
