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
      getInitialNotification?: (
        arg0: unknown,
        success?: (payload: unknown) => void,
        error?: (err: unknown) => void
      ) => void;
      setOnRetenoPushReceivedListener?: (listener: (event: Event) => void) => void;
      setDeviceToken?: (token: string, success?: () => void, error?: (err: unknown) => void) => void;
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
