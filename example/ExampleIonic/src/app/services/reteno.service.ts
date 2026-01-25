import { Injectable } from '@angular/core';

declare global {
  interface Window {
    retenosdk?: {
      init?: (optionsOrSuccess?: unknown, successOrError?: unknown, errorMaybe?: unknown) => Promise<unknown>;
      logEvent?: (payload: unknown, success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      setUserAttributes?: (
        payload: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      setAnonymousUserAttributes?: (
        payload: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      setMultiAccountUserAttributes?: (
        payload: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      getInitialNotification?: (
        arg0: unknown,
        success?: (payload: unknown) => void,
        error?: (err: unknown) => void
      ) => Promise<unknown>;
      setOnRetenoPushReceivedListener?: (listener: (event: Event) => void) => void;
      setDeviceToken?: (token: string, success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      setLifecycleTrackingOptions?: (
        options: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      logScreenView?: (
        screenName: string,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      forcePushData?: (success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      requestNotificationPermission?: (
        success?: (result: unknown) => void,
        error?: (err: unknown) => void
      ) => Promise<unknown>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RetenoService {
  isAvailable(): boolean {
    return !!window.retenosdk;
  }

  setUserAttributes(payload: unknown): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setUserAttributes) {
      return Promise.reject(new Error('retenosdk.setUserAttributes is not available'));
    }
    return sdk.setUserAttributes(payload);
  }

  setAnonymousUserAttributes(payload: unknown): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setAnonymousUserAttributes) {
      return Promise.reject(new Error('retenosdk.setAnonymousUserAttributes is not available'));
    }
    return sdk.setAnonymousUserAttributes(payload);
  }

  logEvent(payload: unknown): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.logEvent) {
      return Promise.reject(new Error('retenosdk.logEvent is not available'));
    }
    return sdk.logEvent(payload);
  }

  getInitialNotification(arg0: unknown = null): Promise<unknown> {
    const sdk = window.retenosdk;
    if (!sdk?.getInitialNotification) {
      return Promise.reject(new Error('retenosdk.getInitialNotification is not available'));
    }
    return sdk.getInitialNotification(arg0);
  }

  requestNotificationPermission(): Promise<unknown> {
    const sdk = window.retenosdk;
    if (!sdk?.requestNotificationPermission) {
      return Promise.reject(new Error('retenosdk.requestNotificationPermission is not available'));
    }
    return sdk.requestNotificationPermission();
  }

  setDeviceToken(token: string): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setDeviceToken) {
      return Promise.reject(new Error('retenosdk.setDeviceToken is not available'));
    }
    return sdk.setDeviceToken(token);
  }

  setMultiAccountUserAttributes(payload: unknown): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setMultiAccountUserAttributes) {
      return Promise.reject(new Error('retenosdk.setMultiAccountUserAttributes is not available'));
    }
    return sdk.setMultiAccountUserAttributes(payload);
  }

  setLifecycleTrackingOptions(options: unknown): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setLifecycleTrackingOptions) {
      return Promise.reject(new Error('retenosdk.setLifecycleTrackingOptions is not available'));
    }
    return sdk.setLifecycleTrackingOptions(options);
  }

  logScreenView(screenName: string): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.logScreenView) {
      return Promise.reject(new Error('retenosdk.logScreenView is not available'));
    }
    return sdk.logScreenView(screenName);
  }

  forcePushData(): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.forcePushData) {
      return Promise.reject(new Error('retenosdk.forcePushData is not available'));
    }
    return sdk.forcePushData();
  }


  onPushReceived(listener: (payload: unknown) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.setOnRetenoPushReceivedListener) {
      sdk.setOnRetenoPushReceivedListener((event: Event) => {
        // Cordova fires a CustomEvent with detail payload.
        const detail = (event as CustomEvent).detail;
        listener(detail);
      });
      return;
    }

    // Fallback in case plugin JS wrapper isn't loaded yet.
    document.addEventListener('reteno-push-received', (event: Event) => {
      const detail = (event as CustomEvent).detail;
      listener(detail);
    });
  }
}
