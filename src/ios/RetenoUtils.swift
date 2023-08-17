import Foundation
import Reteno

@objc public class RetenoUtils: NSObject {
    @objc func processRemoteNotificationsToken(fcmToken: String) {
        Reteno.userNotificationService.processRemoteNotificationsToken(fcmToken);
    }
    
    @objc func start() {
        Reteno.userNotificationService.registerForRemoteNotifications()
    }
}
