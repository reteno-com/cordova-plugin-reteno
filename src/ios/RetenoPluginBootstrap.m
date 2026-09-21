#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

static void RetenoStartDelayedInitializationIfNeeded(void)
{
    Class pluginClass = NSClassFromString(@"RetenoPlugin");
    SEL selector = NSSelectorFromString(@"delayedStartIfNeeded");
    if (pluginClass == Nil || ![pluginClass respondsToSelector:selector]) {
        return;
    }

    IMP implementation = [pluginClass methodForSelector:selector];
    if (implementation != NULL) {
        void (*invoke)(id, SEL) = (void (*)(id, SEL))implementation;
        invoke(pluginClass, selector);
    }
}

static const void *RetenoLaunchHookInstalledKey = &RetenoLaunchHookInstalledKey;

static void RetenoInstallAppDelegateLaunchHook(Class delegateClass)
{
    if ([objc_getAssociatedObject(delegateClass, RetenoLaunchHookInstalledKey) boolValue]) {
        return;
    }
    objc_setAssociatedObject(
        delegateClass,
        RetenoLaunchHookInstalledKey,
        @YES,
        OBJC_ASSOCIATION_RETAIN_NONATOMIC
    );

    SEL launchSelector = @selector(application:didFinishLaunchingWithOptions:);
    Method inheritedOrOwnMethod = class_getInstanceMethod(delegateClass, launchSelector);
    IMP originalImplementation = inheritedOrOwnMethod != NULL
        ? method_getImplementation(inheritedOrOwnMethod)
        : NULL;
    const char *typeEncoding = inheritedOrOwnMethod != NULL
        ? method_getTypeEncoding(inheritedOrOwnMethod)
        : "c@:@@";

    // Give the concrete AppDelegate its own method before replacing the IMP. If
    // the implementation is inherited (Cordova), changing the inherited Method
    // would otherwise affect every subclass of that base class.
    if (inheritedOrOwnMethod != NULL) {
        class_addMethod(delegateClass, launchSelector, originalImplementation, typeEncoding);
    }

    IMP launchHook = imp_implementationWithBlock(^BOOL(
        id appDelegate,
        UIApplication *application,
        NSDictionary<UIApplicationLaunchOptionsKey, id> *launchOptions
    ) {
        // UIApplication is ready here, but the notification response that
        // cold-launched the app has not yet been delivered.
        RetenoStartDelayedInitializationIfNeeded();

        if (originalImplementation == NULL) {
            return YES;
        }

        BOOL (*invokeOriginal)(id, SEL, UIApplication *, NSDictionary *) =
            (BOOL (*)(id, SEL, UIApplication *, NSDictionary *))originalImplementation;
        return invokeOriginal(appDelegate, launchSelector, application, launchOptions);
    });

    Method concreteMethod = class_getInstanceMethod(delegateClass, launchSelector);
    if (concreteMethod != NULL) {
        method_setImplementation(concreteMethod, launchHook);
    } else {
        class_addMethod(delegateClass, launchSelector, launchHook, typeEncoding);
    }
}

/**
 Hooks the concrete AppDelegate as soon as UIKit installs it, then starts
 Reteno's delayed initialization from didFinishLaunchingWithOptions. Cordova and
 Capacitor would otherwise instantiate RetenoPlugin only on the first JS call.
 */
@interface UIApplication (RetenoPluginBootstrap)
- (void)reteno_plugin_setDelegate:(nullable id<UIApplicationDelegate>)delegate;
@end

@implementation UIApplication (RetenoPluginBootstrap)

+ (void)load
{
    // CordovaPlugins can also be linked into notification extensions. Reteno's
    // application-level delayed initialization must only run in the main app.
    NSString *bundleExtension = [[[[NSBundle mainBundle] bundlePath] pathExtension] lowercaseString];
    if ([bundleExtension isEqualToString:@"appex"]) {
        return;
    }

    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        Method originalMethod = class_getInstanceMethod(self, @selector(setDelegate:));
        Method replacementMethod = class_getInstanceMethod(self, @selector(reteno_plugin_setDelegate:));
        if (originalMethod != NULL && replacementMethod != NULL) {
            method_exchangeImplementations(originalMethod, replacementMethod);
        }
    });
}

- (void)reteno_plugin_setDelegate:(nullable id<UIApplicationDelegate>)delegate
{
    // Implementations are exchanged in +load, so this invokes UIKit's original
    // setDelegate: implementation.
    [self reteno_plugin_setDelegate:delegate];

    if (delegate != nil) {
        RetenoInstallAppDelegateLaunchHook([delegate class]);
    }
}

@end
