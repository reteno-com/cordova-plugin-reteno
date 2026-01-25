import { Injectable } from '@angular/core';

declare global {
  interface Window {
    retenosdk?: {
      init?: (optionsOrSuccess?: unknown, successOrError?: unknown, errorMaybe?: unknown) => void;
      logEvent?: (payload: unknown, success?: () => void, error?: (err: unknown) => void) => void;
      setUserAttributes?: (
        payload: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => void;
      setAnonymousUserAttributes?: (
        payload: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => void;
      setMultiAccountUserAttributes?: (
        payload: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => void;
      getInitialNotification?: (
        arg0: unknown,
        success?: (payload: unknown) => void,
        error?: (err: unknown) => void
      ) => void;
      setOnRetenoPushReceivedListener?: (listener: (event: Event) => void) => void;
      setDeviceToken?: (token: string, success?: () => void, error?: (err: unknown) => void) => void;
      setLifecycleTrackingOptions?: (
        options: unknown,
        success?: () => void,
        error?: (err: unknown) => void
      ) => void;
      logScreenView?: (
        screenName: string,
        success?: () => void,
        error?: (err: unknown) => void
      ) => void;
      forcePushData?: (success?: () => void, error?: (err: unknown) => void) => void;
      requestNotificationPermission?: (success?: (result: unknown) => void, error?: (err: unknown) => void) => void;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RetenoService {
  isAvailable(): boolean {
    return !!window.retenosdk;
  }

  setUserAttributes(payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.setUserAttributes) {
        reject(new Error('retenosdk.setUserAttributes is not available'));
        return;
      }
      sdk.setUserAttributes(
        payload,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  setAnonymousUserAttributes(payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.setAnonymousUserAttributes) {
        reject(new Error('retenosdk.setAnonymousUserAttributes is not available'));
        return;
      }
      sdk.setAnonymousUserAttributes(
        payload,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  logEvent(payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.logEvent) {
        reject(new Error('retenosdk.logEvent is not available'));
        return;
      }
      sdk.logEvent(
        payload,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  getInitialNotification(arg0: unknown = null): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.getInitialNotification) {
        reject(new Error('retenosdk.getInitialNotification is not available'));
        return;
      }
      sdk.getInitialNotification(
        arg0,
        (payload) => resolve(payload),
        (err) => reject(err)
      );
    });
  }

  requestNotificationPermission(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.requestNotificationPermission) {
        reject(new Error('retenosdk.requestNotificationPermission is not available'));
        return;
      }
      sdk.requestNotificationPermission(
        (res) => resolve(res),
        (err) => reject(err)
      );
    });
  }

  setDeviceToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.setDeviceToken) {
        reject(new Error('retenosdk.setDeviceToken is not available'));
        return;
      }
      sdk.setDeviceToken(
        token,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  setMultiAccountUserAttributes(payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.setMultiAccountUserAttributes) {
        reject(new Error('retenosdk.setMultiAccountUserAttributes is not available'));
        return;
      }
      sdk.setMultiAccountUserAttributes(
        payload,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  setLifecycleTrackingOptions(options: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.setLifecycleTrackingOptions) {
        reject(new Error('retenosdk.setLifecycleTrackingOptions is not available'));
        return;
      }
      sdk.setLifecycleTrackingOptions(
        options,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  logScreenView(screenName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.logScreenView) {
        reject(new Error('retenosdk.logScreenView is not available'));
        return;
      }
      sdk.logScreenView(
        screenName,
        () => resolve(),
        (err) => reject(err)
      );
    });
  }

  forcePushData(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sdk = window.retenosdk;
      if (!sdk?.forcePushData) {
        reject(new Error('retenosdk.forcePushData is not available'));
        return;
      }
      sdk.forcePushData(
        () => resolve(),
        (err) => reject(err)
      );
    });
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
