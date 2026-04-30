import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { RouterModule } from '@angular/router';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  imports: [IonicModule, RouterModule, AppHeaderComponent],
})
export class MainPage implements OnInit {
  private readonly reteno = inject(RetenoService);
  private readonly platform = inject(Platform);
  initPauseInAppMessages = false;
  initPausePushInAppMessages = false;
  initLifecycleApp = true;
  initLifecycleForeground = false;
  initLifecyclePush = true;
  initLifecycleSessionStart = true;
  initLifecycleSessionEnd = false;
  initSessionDurationSeconds = 30 * 60;
  initScreenReporting = false;
  initialized = false;

  ngOnInit(): void {
    this.syncInitOptions();
    this.initReteno();
  }

  ionViewDidEnter(): void {
    this.initialized = this.reteno.isInitialized();
  }

  initReteno(): void {
    this.reteno.init()
      .then(() => {
        this.initialized = true;
        return this.reteno.requestNotificationPermission()
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('requestNotificationPermission: WARN', err);
          })
          .then(() => this.enableForegroundNotificationPresentation())
          .then(() => this.ensureFcmTokenSynced());
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('initReteno: ERROR', err);
      });
  }

  onInitOptionsChanged(): void {
    this.initScreenReporting = false;
    this.reteno.setInitOptions({
      pauseInAppMessages: this.initPauseInAppMessages,
      pausePushInAppMessages: this.initPausePushInAppMessages,
      isAutomaticScreenReportingEnabled: false,
      sessionDurationSeconds: this.initSessionDurationSeconds,
      lifecycleTrackingOptions: {
        appLifecycleEnabled: this.initLifecycleApp,
        foregroundLifecycleEnabled: this.initLifecycleForeground,
        pushSubscriptionEnabled: this.initLifecyclePush,
        sessionStartEventsEnabled: this.initLifecycleSessionStart,
        sessionEndEventsEnabled: this.initLifecycleSessionEnd,
      },
    });
  }

  forcePushData(): void {
    this.reteno.forcePushData()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('forcePushData: ERROR', err);
      });
  }

  private ensureFcmTokenSynced(): Promise<void> {
    return this.reteno.forcePushData().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('forcePushData after permission request: WARN', err);
    });
  }

  private enableForegroundNotificationPresentation(): Promise<void> {
    if (!this.platform.is('ios')) {
      return Promise.resolve();
    }

    return this.reteno
      .setWillPresentNotificationOptions({ options: ['badge', 'sound', 'banner'] })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('setWillPresentNotificationOptions: WARN', err);
      });
  }

  private syncInitOptions(): void {
    const options = this.reteno.getInitOptions();
    this.initPauseInAppMessages = options.pauseInAppMessages ?? false;
    this.initPausePushInAppMessages = options.pausePushInAppMessages ?? false;
    this.initScreenReporting = false;
    this.initSessionDurationSeconds = Number(options.sessionDurationSeconds ?? 30 * 60);
    const lto = options.lifecycleTrackingOptions as
      | {
          appLifecycleEnabled?: boolean | null;
          foregroundLifecycleEnabled?: boolean | null;
          pushSubscriptionEnabled?: boolean | null;
          sessionStartEventsEnabled?: boolean | null;
          sessionEndEventsEnabled?: boolean | null;
          sessionEventsEnabled?: boolean | null;
        }
      | undefined;
    this.initLifecycleApp = lto?.appLifecycleEnabled ?? true;
    this.initLifecycleForeground = lto?.foregroundLifecycleEnabled ?? false;
    this.initLifecyclePush = lto?.pushSubscriptionEnabled ?? true;
    this.initLifecycleSessionStart = lto?.sessionStartEventsEnabled ?? (lto?.sessionEventsEnabled ?? true);
    this.initLifecycleSessionEnd = lto?.sessionEndEventsEnabled ?? (lto?.sessionEventsEnabled ?? false);
  }
}
