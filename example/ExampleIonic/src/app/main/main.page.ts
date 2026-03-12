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
  initLifecyclePush = true;
  initLifecycleSession = true;
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
      lifecycleTrackingOptions: {
        appLifecycleEnabled: this.initLifecycleApp,
        pushSubscriptionEnabled: this.initLifecyclePush,
        sessionEventsEnabled: this.initLifecycleSession,
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
    this.initPauseInAppMessages = options.pauseInAppMessages;
    this.initPausePushInAppMessages = options.pausePushInAppMessages;
    this.initScreenReporting = false;
    this.initLifecycleApp = options.lifecycleTrackingOptions.appLifecycleEnabled;
    this.initLifecyclePush = options.lifecycleTrackingOptions.pushSubscriptionEnabled;
    this.initLifecycleSession = options.lifecycleTrackingOptions.sessionEventsEnabled;
  }
}
