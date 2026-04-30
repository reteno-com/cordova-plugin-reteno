import { Injectable, inject } from '@angular/core';
import {
  AwesomeCordovaPluginReteno,
  RetenoInitializeOptions,
  LifecycleTrackingOptions,
  SetUserAttributesPayload,
  UserAttributesAnonymous,
  SetMultiAccountUserAttributesPayload,
  LogEventPayload,
  LogEcommerceEventPayload,
  GetAppInboxMessagesPayload,
  AppInboxMessages,
  GetRecommendationsPayload,
  RecommendationsResponse,
  LogRecommendationsPayload,
  NotificationChannelConfig,
  WillPresentNotificationOptionsPayload,
  NotificationPresentationOption,
  NotificationResponseHandlerOptions,
  InAppPauseBehaviour,
  InAppLifecycleListener,
  RequestNotificationPermissionResult,
} from 'awesome-cordova-plugins-reteno/ngx';

export { LifecycleTrackingOptions };

type PageUiState = Record<string, unknown>;

declare global {
  interface Window {
    RetenoPlugin?: unknown;
  }
}

@Injectable({ providedIn: 'root' })
export class RetenoService {
  private readonly reteno = inject(AwesomeCordovaPluginReteno);

  private initialized = false;
  private initPromise: Promise<unknown> | null = null;
  private uiState: Record<string, PageUiState> = {};
  private static readonly defaultLifecycleTrackingOptions = {
    appLifecycleEnabled: true,
    foregroundLifecycleEnabled: false,
    pushSubscriptionEnabled: true,
    sessionStartEventsEnabled: true,
    sessionEndEventsEnabled: false,
  };
  private initOptions: RetenoInitializeOptions = {
    pauseInAppMessages: false,
    pausePushInAppMessages: false,
    isAutomaticScreenReportingEnabled: false,
    isDebugMode: true,
    sessionDurationSeconds: 30 * 60,
    lifecycleTrackingOptions: {
      ...RetenoService.defaultLifecycleTrackingOptions,
    },
  };

  isAvailable(): boolean {
    return !!window.RetenoPlugin;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  setInitOptions(options: Partial<RetenoInitializeOptions>): void {
    if (options.pauseInAppMessages != null) {
      this.initOptions.pauseInAppMessages = options.pauseInAppMessages;
    }
    if (options.pausePushInAppMessages != null) {
      this.initOptions.pausePushInAppMessages = options.pausePushInAppMessages;
    }
    if (options.isAutomaticScreenReportingEnabled != null) {
      this.initOptions.isAutomaticScreenReportingEnabled = options.isAutomaticScreenReportingEnabled;
    }
    if (options.sessionDurationSeconds != null) {
      this.initOptions.sessionDurationSeconds = Number(options.sessionDurationSeconds);
    }
    if (options.sessionDurationMillis != null) {
      this.initOptions.sessionDurationMillis = Number(options.sessionDurationMillis);
    }
    if (options.lifecycleTrackingOptions && typeof options.lifecycleTrackingOptions === 'object') {
      const lto = options.lifecycleTrackingOptions as {
        appLifecycleEnabled?: boolean | null;
        foregroundLifecycleEnabled?: boolean | null;
        pushSubscriptionEnabled?: boolean | null;
        sessionEventsEnabled?: boolean | null;
        sessionStartEventsEnabled?: boolean | null;
        sessionEndEventsEnabled?: boolean | null;
      };
      const currentRaw = this.initOptions.lifecycleTrackingOptions as {
        appLifecycleEnabled?: boolean | null;
        foregroundLifecycleEnabled?: boolean | null;
        pushSubscriptionEnabled?: boolean | null;
        sessionStartEventsEnabled?: boolean | null;
        sessionEndEventsEnabled?: boolean | null;
      };
      const current = {
        ...RetenoService.defaultLifecycleTrackingOptions,
        ...(currentRaw ?? {}),
      };
      const legacySessionEventsEnabled =
        lto.sessionEventsEnabled != null ? Boolean(lto.sessionEventsEnabled) : undefined;
      this.initOptions.lifecycleTrackingOptions = {
        appLifecycleEnabled:
          lto.appLifecycleEnabled != null ? Boolean(lto.appLifecycleEnabled) : current.appLifecycleEnabled,
        foregroundLifecycleEnabled:
          lto.foregroundLifecycleEnabled != null
            ? Boolean(lto.foregroundLifecycleEnabled)
            : current.foregroundLifecycleEnabled,
        pushSubscriptionEnabled:
          lto.pushSubscriptionEnabled != null ? Boolean(lto.pushSubscriptionEnabled) : current.pushSubscriptionEnabled,
        sessionStartEventsEnabled:
          lto.sessionStartEventsEnabled != null
            ? Boolean(lto.sessionStartEventsEnabled)
            : (legacySessionEventsEnabled != null ? legacySessionEventsEnabled : current.sessionStartEventsEnabled),
        sessionEndEventsEnabled:
          lto.sessionEndEventsEnabled != null
            ? Boolean(lto.sessionEndEventsEnabled)
            : (legacySessionEventsEnabled != null ? legacySessionEventsEnabled : current.sessionEndEventsEnabled),
      };
    }
  }

  getInitOptions(): RetenoInitializeOptions {
    return { ...this.initOptions };
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
    this.initPromise = this.reteno
      .init({ ...this.initOptions })
      .then((res: any) => {
        this.initialized = true;
        this.initPromise = null;
        return res;
      })
      .catch((err: any) => {
        this.initPromise = null;
        throw err;
      });
    return this.initPromise!;
  }

  private withInit<T>(action: () => Promise<T>): Promise<T> {
    return this.ensureInit().then(action);
  }

  init(options?: Partial<RetenoInitializeOptions>): Promise<unknown> {
    if (options) {
      this.setInitOptions(options);
    }
    return this.ensureInit();
  }

  setUserAttributes(payload: unknown): Promise<any> {
    return this.withInit(() => this.reteno.setUserAttributes(payload as SetUserAttributesPayload));
  }

  setAnonymousUserAttributes(payload: unknown): Promise<any> {
    return this.withInit(() => this.reteno.setAnonymousUserAttributes(payload as UserAttributesAnonymous));
  }

  logEvent(payload: unknown): Promise<any> {
    return this.withInit(() => this.reteno.logEvent(payload as LogEventPayload));
  }

  getInitialNotification(): Promise<any> {
    return this.withInit(() => this.reteno.getInitialNotification());
  }

  requestNotificationPermission(): Promise<RequestNotificationPermissionResult> {
    return this.withInit(() => this.reteno.requestNotificationPermission());
  }

  setWillPresentNotificationOptions(
    payload: { options?: string[]; presentationOptions?: string[]; emitEvent?: boolean } | string[] | null
  ): Promise<any> {
    return this.withInit(() =>
      this.reteno.setWillPresentNotificationOptions(payload as WillPresentNotificationOptionsPayload | NotificationPresentationOption[] | null)
    );
  }

  setDidReceiveNotificationResponseHandler(
    options?: NotificationResponseHandlerOptions | boolean | null
  ): Promise<any> {
    return this.withInit(() => this.reteno.setDidReceiveNotificationResponseHandler(options));
  }

  setDeviceToken(token: string): Promise<any> {
    return this.withInit(() => this.reteno.setDeviceToken(token));
  }

  setMultiAccountUserAttributes(payload: unknown): Promise<any> {
    return this.withInit(() => this.reteno.setMultiAccountUserAttributes(payload as SetMultiAccountUserAttributesPayload));
  }

  setLifecycleTrackingOptions(options: LifecycleTrackingOptions): Promise<any> {
    return this.withInit(() => this.reteno.setLifecycleTrackingOptions(options));
  }

  logScreenView(screenName: string): Promise<any> {
    return this.withInit(() => this.reteno.logScreenView(screenName));
  }

  forcePushData(): Promise<any> {
    return this.withInit(() => this.reteno.forcePushData());
  }

  updateDefaultNotificationChannel(config: NotificationChannelConfig): Promise<any> {
    return this.withInit(() => this.reteno.updateDefaultNotificationChannel(config));
  }

  pauseInAppMessages(isPaused: boolean): Promise<any> {
    return this.withInit(() => this.reteno.pauseInAppMessages(isPaused));
  }

  setInAppMessagesPauseBehaviour(behaviour: InAppPauseBehaviour | string): Promise<any> {
    return this.withInit(() => this.reteno.setInAppMessagesPauseBehaviour(behaviour as InAppPauseBehaviour));
  }

  setOnInAppLifecycleCallback(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnInAppLifecycleCallback(handler as unknown as InAppLifecycleListener);
    return handler;
  }

  removeOnInAppLifecycleCallback(handler: (event: Event) => void): void {
    this.reteno.setOnInAppLifecycleCallback(null);
  }

  setOnInAppMessageCustomDataReceivedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnInAppMessageCustomDataReceivedListener(handler as any);
    return handler;
  }

  removeOnInAppMessageCustomDataReceivedListener(handler: (event: Event) => void): void {
    this.reteno.removeOnInAppMessageCustomDataReceivedListener(handler as any);
  }

  getAppInboxMessages(payload: { page: number; pageSize: number; status?: string }): Promise<AppInboxMessages> {
    return this.withInit(() => this.reteno.getAppInboxMessages(payload as GetAppInboxMessagesPayload));
  }

  getAppInboxMessagesCount(): Promise<number> {
    return this.withInit(() => this.reteno.getAppInboxMessagesCount());
  }

  subscribeOnMessagesCountChanged(
    listener: (count: number) => void,
    error?: (err: unknown) => void
  ): Promise<unknown> {
    return this.withInit(() => {
      return new Promise<void>((resolve, reject) => {
        try {
          this.reteno.subscribeOnMessagesCountChanged().subscribe({
            next: (count) => listener(count),
            error: (err) => {
              if (error) {
                error(err);
              }
              reject(err);
            },
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  unsubscribeMessagesCountChanged(): Promise<any> {
    return this.withInit(() => this.reteno.unsubscribeMessagesCountChanged());
  }

  markAsOpened(messageId: string): Promise<any> {
    return this.withInit(() => this.reteno.markAsOpened(messageId));
  }

  markAllMessagesAsOpened(): Promise<any> {
    return this.withInit(() => this.reteno.markAllMessagesAsOpened());
  }

  getRecommendations(payload: unknown): Promise<RecommendationsResponse> {
    return this.withInit(() => this.reteno.getRecommendations(payload as GetRecommendationsPayload));
  }

  logRecommendations(payload: unknown): Promise<any> {
    return this.withInit(() => this.reteno.logRecommendations(payload as LogRecommendationsPayload));
  }

  logEcommerceEvent(payload: unknown): Promise<any> {
    return this.withInit(() => this.reteno.logEcommerceEvent(payload as LogEcommerceEventPayload));
  }

  onPushReceived(listener: (payload: unknown) => void): void {
    this.reteno.setOnRetenoPushReceivedListener(listener as any);
  }

  setOnRetenoPushReceivedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnRetenoPushReceivedListener(handler as any);
    return handler;
  }

  removeOnRetenoPushReceivedListener(handler: (event: Event) => void): void {
    this.reteno.removeOnRetenoPushReceivedListener(handler as any);
  }

  setOnRetenoNotificationClickedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnRetenoNotificationClickedListener(handler as any);
    return handler;
  }

  removeOnRetenoNotificationClickedListener(handler: (event: Event) => void): void {
    this.reteno.removeOnRetenoNotificationClickedListener(handler as any);
  }

  setOnRetenoPushDismissedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnRetenoPushDismissedListener(handler as any);
    return handler;
  }

  removeOnRetenoPushDismissedListener(handler: (event: Event) => void): void {
    this.reteno.removeOnRetenoPushDismissedListener(handler as any);
  }

  setOnRetenoCustomPushReceivedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnRetenoCustomPushReceivedListener(handler as any);
    return handler;
  }

  removeOnRetenoCustomPushReceivedListener(handler: (event: Event) => void): void {
    this.reteno.removeOnRetenoCustomPushReceivedListener(handler as any);
  }

  setNotificationActionHandler(options?: NotificationResponseHandlerOptions | boolean): Promise<any> {
    return this.withInit(() => this.reteno.setNotificationActionHandler(options));
  }

  setOnRetenoPushButtonClickedListener(listener: (payload: unknown) => void): (event: Event) => void {
    const handler = (eventOrPayload: Event | unknown) => {
      const detail = (eventOrPayload as CustomEvent).detail;
      const payload = detail !== undefined ? detail : eventOrPayload;
      listener(payload);
    };
    this.reteno.setOnRetenoPushButtonClickedListener(handler as any);
    return handler;
  }

  removeOnRetenoPushButtonClickedListener(handler: (event: Event) => void): void {
    this.reteno.removeOnRetenoPushButtonClickedListener(handler as any);
  }
}
