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

type PageUiState = Record<string, unknown>;

declare global {
  interface Window {
    RetenoPlugin?: {
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
  private uiState: Record<string, PageUiState> = {};
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
    return !!window.RetenoPlugin;
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

  getPageState<T extends PageUiState>(pageKey: string, defaults: T): T {
    const raw = this.uiState[pageKey];
    if (!raw) {
      return { ...defaults };
    }
    return { ...defaults, ...(raw as Partial<T>) };
  }

  setPageState<T extends PageUiState>(pageKey: string, patch: Partial<T>): void {
    const current = this.uiState[pageKey] ?? {};
    this.uiState[pageKey] = {
      ...current,
      ...patch,
    };
  }

  private ensureInit(): Promise<unknown> {
    if (this.initialized) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    const sdk = window.RetenoPlugin;
    if (!sdk?.init) {
      return Promise.reject(new Error('RetenoPlugin is not available'));
    }
    this.initPromise = sdk.init({
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
      const sdk = window.RetenoPlugin;
      if (!sdk?.setUserAttributes) {
        return Promise.reject(new Error('RetenoPlugin.setUserAttributes is not available'));
      }
      return sdk.setUserAttributes(payload);
    });
  }

  setAnonymousUserAttributes(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setAnonymousUserAttributes) {
        return Promise.reject(new Error('RetenoPlugin.setAnonymousUserAttributes is not available'));
      }
      return sdk.setAnonymousUserAttributes(payload);
    });
  }

  logEvent(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.logEvent) {
        return Promise.reject(new Error('RetenoPlugin.logEvent is not available'));
      }
      return sdk.logEvent(payload);
    });
  }

  getInitialNotification(arg0: unknown = null): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.getInitialNotification) {
        return Promise.reject(new Error('RetenoPlugin.getInitialNotification is not available'));
      }
      return sdk.getInitialNotification(arg0);
    });
  }

  requestNotificationPermission(): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.requestNotificationPermission) {
        return Promise.reject(new Error('RetenoPlugin.requestNotificationPermission is not available'));
      }
      return sdk.requestNotificationPermission();
    });
  }

  setWillPresentNotificationOptions(payload: { options?: string[]; emitEvent?: boolean } | string[] | null): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setWillPresentNotificationOptions) {
        return Promise.reject(new Error('RetenoPlugin.setWillPresentNotificationOptions is not available'));
      }
      return sdk.setWillPresentNotificationOptions(payload);
    });
  }

  setDidReceiveNotificationResponseHandler(payload: { enabled?: boolean; emitEvent?: boolean } | boolean | null): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setDidReceiveNotificationResponseHandler) {
        return Promise.reject(new Error('RetenoPlugin.setDidReceiveNotificationResponseHandler is not available'));
      }
      return sdk.setDidReceiveNotificationResponseHandler(payload);
    });
  }

  setDeviceToken(token: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setDeviceToken) {
        return Promise.reject(new Error('RetenoPlugin.setDeviceToken is not available'));
      }
      return sdk.setDeviceToken(token);
    });
  }

  setMultiAccountUserAttributes(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setMultiAccountUserAttributes) {
        return Promise.reject(new Error('RetenoPlugin.setMultiAccountUserAttributes is not available'));
      }
      return sdk.setMultiAccountUserAttributes(payload);
    });
  }

  setLifecycleTrackingOptions(options: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setLifecycleTrackingOptions) {
        return Promise.reject(new Error('RetenoPlugin.setLifecycleTrackingOptions is not available'));
      }
      return sdk.setLifecycleTrackingOptions(options);
    });
  }

  logScreenView(screenName: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.logScreenView) {
        return Promise.reject(new Error('RetenoPlugin.logScreenView is not available'));
      }
      return sdk.logScreenView(screenName);
    });
  }

  forcePushData(): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.forcePushData) {
        return Promise.reject(new Error('RetenoPlugin.forcePushData is not available'));
      }
      return sdk.forcePushData();
    });
  }

  updateDefaultNotificationChannel(config: { name: string; description: string }): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.updateDefaultNotificationChannel) {
        return Promise.reject(new Error('RetenoPlugin.updateDefaultNotificationChannel is not available'));
      }
      return sdk.updateDefaultNotificationChannel(config);
    });
  }

  pauseInAppMessages(isPaused: boolean): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.pauseInAppMessages) {
        return Promise.reject(new Error('RetenoPlugin.pauseInAppMessages is not available'));
      }
      return sdk.pauseInAppMessages(isPaused);
    });
  }

  setInAppMessagesPauseBehaviour(behaviour: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setInAppMessagesPauseBehaviour) {
        return Promise.reject(new Error('RetenoPlugin.setInAppMessagesPauseBehaviour is not available'));
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
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
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
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
    if (sdk?.removeOnInAppMessageCustomDataReceivedListener) {
      sdk.removeOnInAppMessageCustomDataReceivedListener(handler);
      return;
    }
    document.removeEventListener('reteno-in-app-custom-data', handler);
  }

  getAppInboxMessages(payload: { page: number; pageSize: number; status?: string }): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.getAppInboxMessages) {
        return Promise.reject(new Error('RetenoPlugin.getAppInboxMessages is not available'));
      }
      return sdk.getAppInboxMessages(payload);
    });
  }

  getAppInboxMessagesCount(): Promise<number> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.getAppInboxMessagesCount) {
        return Promise.reject(new Error('RetenoPlugin.getAppInboxMessagesCount is not available'));
      }
      return sdk.getAppInboxMessagesCount();
    });
  }

  subscribeOnMessagesCountChanged(
    listener: (count: number) => void,
    error?: (err: unknown) => void
  ): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.subscribeOnMessagesCountChanged) {
        return Promise.reject(new Error('RetenoPlugin.subscribeOnMessagesCountChanged is not available'));
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
      const sdk = window.RetenoPlugin;
      if (!sdk?.unsubscribeMessagesCountChanged) {
        return Promise.reject(new Error('RetenoPlugin.unsubscribeMessagesCountChanged is not available'));
      }
      return sdk.unsubscribeMessagesCountChanged();
    });
  }

  markAsOpened(messageId: string): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.markAsOpened) {
        return Promise.reject(new Error('RetenoPlugin.markAsOpened is not available'));
      }
      return sdk.markAsOpened(messageId);
    });
  }

  markAllMessagesAsOpened(): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.markAllMessagesAsOpened) {
        return Promise.reject(new Error('RetenoPlugin.markAllMessagesAsOpened is not available'));
      }
      return sdk.markAllMessagesAsOpened();
    });
  }

  getRecommendations(payload: unknown): Promise<unknown> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.getRecommendations) {
        return Promise.reject(new Error('RetenoPlugin.getRecommendations is not available'));
      }
      return sdk.getRecommendations(payload);
    });
  }

  logRecommendations(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.logRecommendations) {
        return Promise.reject(new Error('RetenoPlugin.logRecommendations is not available'));
      }
      return sdk.logRecommendations(payload);
    });
  }

  logEcommerceEvent(payload: unknown): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.logEcommerceEvent) {
        return Promise.reject(new Error('RetenoPlugin.logEcommerceEvent is not available'));
      }
      return sdk.logEcommerceEvent(payload);
    });
  }


  onPushReceived(listener: (payload: unknown) => void): void {
    this.ensureInit()
      .then(() => {
        const sdk = window.RetenoPlugin;
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
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
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
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
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
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
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
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
    if (sdk?.removeOnRetenoCustomPushReceivedListener) {
      sdk.removeOnRetenoCustomPushReceivedListener(handler);
      return;
    }
    document.removeEventListener('reteno-custom-push-received', handler);
  }

  setNotificationActionHandler(payload: { enabled?: boolean; emitEvent?: boolean } | boolean | null): Promise<void> {
    return this.withInit(() => {
      const sdk = window.RetenoPlugin;
      if (!sdk?.setNotificationActionHandler) {
        return Promise.reject(new Error('RetenoPlugin.setNotificationActionHandler is not available'));
      }
      return sdk.setNotificationActionHandler(payload);
    });
  }

  setOnRetenoPushButtonClickedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.ensureInit()
      .then(() => {
        const sdk = window.RetenoPlugin;
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
    const sdk = window.RetenoPlugin;
    if (sdk?.removeOnRetenoPushButtonClickedListener) {
      sdk.removeOnRetenoPushButtonClickedListener(handler);
      return;
    }
    document.removeEventListener('reteno-push-button-clicked', handler);
  }
}
