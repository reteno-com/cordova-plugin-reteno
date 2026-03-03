import { Injectable } from '@angular/core';

export type LifecycleTrackingOptions =
  | {
      appLifecycleEnabled?: boolean | null;
      pushSubscriptionEnabled?: boolean | null;
      sessionEventsEnabled?: boolean | null;
    }
  | 'ALL'
  | 'NONE'
  | string;

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
      setOnRetenoNotificationClickedListener?: (listener: (event: Event) => void) => void;
      removeOnRetenoPushReceivedListener?: (listener: (event: Event) => void) => void;
      removeOnRetenoNotificationClickedListener?: (listener: (event: Event) => void) => void;
      setOnRetenoPushDismissedListener?: (listener: (event: Event) => void) => void;
      removeOnRetenoPushDismissedListener?: (listener: (event: Event) => void) => void;
      setOnRetenoCustomPushReceivedListener?: (listener: (event: Event) => void) => void;
      removeOnRetenoCustomPushReceivedListener?: (listener: (event: Event) => void) => void;
      setOnRetenoPushButtonClickedListener?: (listener: (event: Event) => void) => void;
      removeOnRetenoPushButtonClickedListener?: (listener: (event: Event) => void) => void;
      setNotificationActionHandler?: (
        payload: { enabled?: boolean; emitEvent?: boolean } | boolean | null,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
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
      setWillPresentNotificationOptions?: (
        payload: { options?: string[]; presentationOptions?: string[]; emitEvent?: boolean } | string[] | null,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      setDidReceiveNotificationResponseHandler?: (
        payload: { enabled?: boolean; emitEvent?: boolean } | boolean | null,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      updateDefaultNotificationChannel?: (
        config: { name: string; description: string },
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      pauseInAppMessages?: (isPaused: boolean, success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      setInAppMessagesPauseBehaviour?: (
        behaviour: string,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      setOnInAppLifecycleCallback?: (
        listener: ((event: Event) => void) | null,
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<unknown> | void;
      setOnInAppMessageCustomDataReceivedListener?: (listener: (event: Event) => void) => void;
      removeOnInAppMessageCustomDataReceivedListener?: (listener: (event: Event) => void) => void;
      getAppInboxMessages?: (
        payload: { page: number; pageSize: number; status?: string },
        success?: (result: unknown) => void,
        error?: (err: unknown) => void
      ) => Promise<unknown>;
      getAppInboxMessagesCount?: (
        success?: (count: number) => void,
        error?: (err: unknown) => void
      ) => Promise<number>;
      subscribeOnMessagesCountChanged?: (
        success?: (count: number) => void,
        error?: (err: unknown) => void
      ) => Promise<unknown> | void;
      unsubscribeMessagesCountChanged?: (
        success?: () => void,
        error?: (err: unknown) => void
      ) => Promise<void>;
      markAsOpened?: (messageId: string, success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      markAllMessagesAsOpened?: (success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      getRecommendations?: (
        payload: unknown,
        success?: (result: unknown) => void,
        error?: (err: unknown) => void
      ) => Promise<unknown>;
      logRecommendations?: (payload: unknown, success?: () => void, error?: (err: unknown) => void) => Promise<void>;
      logEcommerceEvent?: (payload: unknown, success?: () => void, error?: (err: unknown) => void) => Promise<void>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RetenoService {
  private initialized = false;
  private initPromise: Promise<unknown> | null = null;
  private initOptions: {
    pauseInAppMessages: boolean;
    pausePushInAppMessages: boolean;
    isAutomaticScreenReportingEnabled: boolean;
    isDebugMode: boolean;
    lifecycleTrackingOptions: {
      appLifecycleEnabled: boolean;
      pushSubscriptionEnabled: boolean;
      sessionEventsEnabled: boolean;
    };
  } = {
    pauseInAppMessages: false,
    pausePushInAppMessages: false,
    isAutomaticScreenReportingEnabled: false,
    isDebugMode: true,
    lifecycleTrackingOptions: {
      appLifecycleEnabled: true,
      pushSubscriptionEnabled: true,
      sessionEventsEnabled: true,
    },
  };

  isAvailable(): boolean {
    return !!window.retenosdk;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  setInitOptions(options: {
    pauseInAppMessages?: boolean;
    pausePushInAppMessages?: boolean;
    isAutomaticScreenReportingEnabled?: boolean;
    lifecycleTrackingOptions?: LifecycleTrackingOptions | string;
  }): void {
    if (options.pauseInAppMessages != null) {
      this.initOptions.pauseInAppMessages = options.pauseInAppMessages;
    }
    if (options.pausePushInAppMessages != null) {
      this.initOptions.pausePushInAppMessages = options.pausePushInAppMessages;
    }
    if (options.isAutomaticScreenReportingEnabled != null) {
      this.initOptions.isAutomaticScreenReportingEnabled = options.isAutomaticScreenReportingEnabled;
    }
    if (options.lifecycleTrackingOptions && typeof options.lifecycleTrackingOptions === 'object') {
      const lto = options.lifecycleTrackingOptions as {
        appLifecycleEnabled?: boolean | null;
        pushSubscriptionEnabled?: boolean | null;
        sessionEventsEnabled?: boolean | null;
      };
      this.initOptions.lifecycleTrackingOptions = {
        appLifecycleEnabled:
          lto.appLifecycleEnabled != null
            ? Boolean(lto.appLifecycleEnabled)
            : this.initOptions.lifecycleTrackingOptions.appLifecycleEnabled,
        pushSubscriptionEnabled:
          lto.pushSubscriptionEnabled != null
            ? Boolean(lto.pushSubscriptionEnabled)
            : this.initOptions.lifecycleTrackingOptions.pushSubscriptionEnabled,
        sessionEventsEnabled:
          lto.sessionEventsEnabled != null
            ? Boolean(lto.sessionEventsEnabled)
            : this.initOptions.lifecycleTrackingOptions.sessionEventsEnabled,
      };
    }
  }

  getInitOptions(): {
    pauseInAppMessages: boolean;
    pausePushInAppMessages: boolean;
    isAutomaticScreenReportingEnabled: boolean;
    isDebugMode: boolean;
    lifecycleTrackingOptions: {
      appLifecycleEnabled: boolean;
      pushSubscriptionEnabled: boolean;
      sessionEventsEnabled: boolean;
    };
  } {
    return {
      pauseInAppMessages: this.initOptions.pauseInAppMessages,
      pausePushInAppMessages: this.initOptions.pausePushInAppMessages,
      isAutomaticScreenReportingEnabled: this.initOptions.isAutomaticScreenReportingEnabled,
      isDebugMode: this.initOptions.isDebugMode,
      lifecycleTrackingOptions: { ...this.initOptions.lifecycleTrackingOptions },
    };
  }

  private ensureInit(): Promise<unknown> {
    if (this.initialized) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    const sdk = window.retenosdk;
    if (!sdk?.init) {
      return Promise.reject(new Error('retenosdk.init is not available'));
    }
    this.initPromise = sdk
      .init({
        pauseInAppMessages: this.initOptions.pauseInAppMessages,
        pausePushInAppMessages: this.initOptions.pausePushInAppMessages,
        isAutomaticScreenReportingEnabled: this.initOptions.isAutomaticScreenReportingEnabled,
        isDebugMode: this.initOptions.isDebugMode,
        lifecycleTrackingOptions: { ...this.initOptions.lifecycleTrackingOptions },
      })
      .then((res) => {
        this.initialized = true;
        this.initPromise = null;
        return res;
      })
      .catch((err) => {
        this.initPromise = null;
        throw err;
      });
    return this.initPromise;
  }

  private withInit<T>(action: () => Promise<T>): Promise<T> {
    return this.ensureInit().then(action);
  }

  init(options?: {
    pauseInAppMessages?: boolean;
    pausePushInAppMessages?: boolean;
    isAutomaticScreenReportingEnabled?: boolean;
    lifecycleTrackingOptions?: LifecycleTrackingOptions | string;
  }): Promise<unknown> {
    if (options) {
      this.setInitOptions(options);
    }
    return this.ensureInit();
  }

  setUserAttributes(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.setUserAttributes) {
        return Promise.reject(new Error('retenosdk.setUserAttributes is not available'));
      }
      return sdk.setUserAttributes(payload);
    });
  }

  setAnonymousUserAttributes(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.setAnonymousUserAttributes) {
        return Promise.reject(new Error('retenosdk.setAnonymousUserAttributes is not available'));
      }
      return sdk.setAnonymousUserAttributes(payload);
    });
  }

  logEvent(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.logEvent) {
        return Promise.reject(new Error('retenosdk.logEvent is not available'));
      }
      return sdk.logEvent(payload);
    });
  }

  getInitialNotification(arg0: unknown = null): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.getInitialNotification) {
        return Promise.reject(new Error('retenosdk.getInitialNotification is not available'));
      }
      return sdk.getInitialNotification(arg0);
    });
  }

  requestNotificationPermission(): Promise<unknown> {
    const sdk = window.retenosdk;
    if (!sdk?.requestNotificationPermission) {
      return Promise.reject(new Error('retenosdk.requestNotificationPermission is not available'));
    }
    return sdk.requestNotificationPermission();
  }

  setWillPresentNotificationOptions(payload: { options?: string[]; emitEvent?: boolean } | string[] | null): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setWillPresentNotificationOptions) {
      return Promise.reject(new Error('retenosdk.setWillPresentNotificationOptions is not available'));
    }
    return sdk.setWillPresentNotificationOptions(payload);
  }

  setDidReceiveNotificationResponseHandler(payload: { enabled?: boolean; emitEvent?: boolean } | boolean | null): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setDidReceiveNotificationResponseHandler) {
      return Promise.reject(new Error('retenosdk.setDidReceiveNotificationResponseHandler is not available'));
    }
    return sdk.setDidReceiveNotificationResponseHandler(payload);
  }

  setDeviceToken(token: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.setDeviceToken) {
        return Promise.reject(new Error('retenosdk.setDeviceToken is not available'));
      }
      return sdk.setDeviceToken(token);
    });
  }

  setMultiAccountUserAttributes(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.setMultiAccountUserAttributes) {
        return Promise.reject(new Error('retenosdk.setMultiAccountUserAttributes is not available'));
      }
      return sdk.setMultiAccountUserAttributes(payload);
    });
  }

  setLifecycleTrackingOptions(options: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.setLifecycleTrackingOptions) {
        return Promise.reject(new Error('retenosdk.setLifecycleTrackingOptions is not available'));
      }
      return sdk.setLifecycleTrackingOptions(options);
    });
  }

  logScreenView(screenName: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.logScreenView) {
        return Promise.reject(new Error('retenosdk.logScreenView is not available'));
      }
      return sdk.logScreenView(screenName);
    });
  }

  forcePushData(): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.forcePushData) {
        return Promise.reject(new Error('retenosdk.forcePushData is not available'));
      }
      return sdk.forcePushData();
    });
  }

  updateDefaultNotificationChannel(config: { name: string; description: string }): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.updateDefaultNotificationChannel) {
        return Promise.reject(new Error('retenosdk.updateDefaultNotificationChannel is not available'));
      }
      return sdk.updateDefaultNotificationChannel(config);
    });
  }

  pauseInAppMessages(isPaused: boolean): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.pauseInAppMessages) {
        return Promise.reject(new Error('retenosdk.pauseInAppMessages is not available'));
      }
      return sdk.pauseInAppMessages(isPaused);
    });
  }

  setInAppMessagesPauseBehaviour(behaviour: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.setInAppMessagesPauseBehaviour) {
        return Promise.reject(new Error('retenosdk.setInAppMessagesPauseBehaviour is not available'));
      }
      return sdk.setInAppMessagesPauseBehaviour(behaviour);
    });
  }

  setOnInAppLifecycleCallback(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnInAppLifecycleCallback) {
          sdk.setOnInAppLifecycleCallback(handler);
        } else {
          document.addEventListener('reteno-in-app-lifecycle', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnInAppLifecycleCallback(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.setOnInAppLifecycleCallback) {
      sdk.setOnInAppLifecycleCallback(null);
    }
    document.removeEventListener('reteno-in-app-lifecycle', handler);
  }

  setOnInAppMessageCustomDataReceivedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnInAppMessageCustomDataReceivedListener) {
          sdk.setOnInAppMessageCustomDataReceivedListener(handler);
        } else {
          document.addEventListener('reteno-in-app-custom-data', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnInAppMessageCustomDataReceivedListener(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.removeOnInAppMessageCustomDataReceivedListener) {
      sdk.removeOnInAppMessageCustomDataReceivedListener(handler);
      return;
    }
    document.removeEventListener('reteno-in-app-custom-data', handler);
  }

  getAppInboxMessages(payload: { page: number; pageSize: number; status?: string }): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.getAppInboxMessages) {
        return Promise.reject(new Error('retenosdk.getAppInboxMessages is not available'));
      }
      return sdk.getAppInboxMessages(payload);
    });
  }

  getAppInboxMessagesCount(): Promise<number> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.getAppInboxMessagesCount) {
        return Promise.reject(new Error('retenosdk.getAppInboxMessagesCount is not available'));
      }
      return sdk.getAppInboxMessagesCount();
    });
  }

  subscribeOnMessagesCountChanged(
    listener: (count: number) => void,
    error?: (err: unknown) => void
  ): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.subscribeOnMessagesCountChanged) {
        return Promise.reject(new Error('retenosdk.subscribeOnMessagesCountChanged is not available'));
      }
      const res = sdk.subscribeOnMessagesCountChanged(listener, error);
      if (res && typeof (res as Promise<unknown>).then === 'function') {
        return res as Promise<unknown>;
      }
      return Promise.resolve();
    });
  }

  unsubscribeMessagesCountChanged(): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.unsubscribeMessagesCountChanged) {
        return Promise.reject(new Error('retenosdk.unsubscribeMessagesCountChanged is not available'));
      }
      return sdk.unsubscribeMessagesCountChanged();
    });
  }

  markAsOpened(messageId: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.markAsOpened) {
        return Promise.reject(new Error('retenosdk.markAsOpened is not available'));
      }
      return sdk.markAsOpened(messageId);
    });
  }

  markAllMessagesAsOpened(): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.markAllMessagesAsOpened) {
        return Promise.reject(new Error('retenosdk.markAllMessagesAsOpened is not available'));
      }
      return sdk.markAllMessagesAsOpened();
    });
  }

  getRecommendations(payload: unknown): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.getRecommendations) {
        return Promise.reject(new Error('retenosdk.getRecommendations is not available'));
      }
      return sdk.getRecommendations(payload);
    });
  }

  logRecommendations(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.logRecommendations) {
        return Promise.reject(new Error('retenosdk.logRecommendations is not available'));
      }
      return sdk.logRecommendations(payload);
    });
  }

  logEcommerceEvent(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.retenosdk;
      if (!sdk?.logEcommerceEvent) {
        return Promise.reject(new Error('retenosdk.logEcommerceEvent is not available'));
      }
      return sdk.logEcommerceEvent(payload);
    });
  }


  onPushReceived(listener: (payload: unknown) => void): void {
    this.ensureInit()
      .then(() => {
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
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
  }

  setOnRetenoPushReceivedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnRetenoPushReceivedListener) {
          sdk.setOnRetenoPushReceivedListener(handler);
        } else {
          document.addEventListener('reteno-push-received', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnRetenoPushReceivedListener(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.removeOnRetenoPushReceivedListener) {
      sdk.removeOnRetenoPushReceivedListener(handler);
      return;
    }
    document.removeEventListener('reteno-push-received', handler);
  }

  setOnRetenoNotificationClickedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnRetenoNotificationClickedListener) {
          sdk.setOnRetenoNotificationClickedListener(handler);
        } else {
          document.addEventListener('reteno-notification-clicked', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnRetenoNotificationClickedListener(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.removeOnRetenoNotificationClickedListener) {
      sdk.removeOnRetenoNotificationClickedListener(handler);
      return;
    }
    document.removeEventListener('reteno-notification-clicked', handler);
  }

  setOnRetenoPushDismissedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnRetenoPushDismissedListener) {
          sdk.setOnRetenoPushDismissedListener(handler);
        } else {
          document.addEventListener('reteno-push-dismissed', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnRetenoPushDismissedListener(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.removeOnRetenoPushDismissedListener) {
      sdk.removeOnRetenoPushDismissedListener(handler);
      return;
    }
    document.removeEventListener('reteno-push-dismissed', handler);
  }

  setOnRetenoCustomPushReceivedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnRetenoCustomPushReceivedListener) {
          sdk.setOnRetenoCustomPushReceivedListener(handler);
        } else {
          document.addEventListener('reteno-custom-push-received', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnRetenoCustomPushReceivedListener(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.removeOnRetenoCustomPushReceivedListener) {
      sdk.removeOnRetenoCustomPushReceivedListener(handler);
      return;
    }
    document.removeEventListener('reteno-custom-push-received', handler);
  }

  setNotificationActionHandler(payload: { enabled?: boolean; emitEvent?: boolean } | boolean | null): Promise<void> {
    const sdk = window.retenosdk;
    if (!sdk?.setNotificationActionHandler) {
      return Promise.reject(new Error('retenosdk.setNotificationActionHandler is not available'));
    }
    return sdk.setNotificationActionHandler(payload);
  }

  setOnRetenoPushButtonClickedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.retenosdk;
        if (sdk?.setOnRetenoPushButtonClickedListener) {
          sdk.setOnRetenoPushButtonClickedListener(handler);
        } else {
          document.addEventListener('reteno-push-button-clicked', handler);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('reteno init error', err);
      });
    return handler;
  }

  removeOnRetenoPushButtonClickedListener(handler: (event: Event) => void): void {
    const sdk = window.retenosdk;
    if (sdk?.removeOnRetenoPushButtonClickedListener) {
      sdk.removeOnRetenoPushButtonClickedListener(handler);
      return;
    }
    document.removeEventListener('reteno-push-button-clicked', handler);
  }
}
