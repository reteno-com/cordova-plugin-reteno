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
  isIos = false;

  ngOnInit(): void {
    this.isIos = this.platform.is('ios');
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
          });
      })
      .then(() => {
        if (this.isIos) {
          return this.reteno.setFCMToken()
            .then((token: unknown) => {
              // eslint-disable-next-line no-console
              console.log('setFCMToken: OK', token);
            })
            .catch((err: unknown) => {
              // eslint-disable-next-line no-console
              console.warn('setFCMToken: WARN', err);
            });
        }
        return Promise.resolve();
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('initReteno: ERROR', err);
      });
  }

  onInitOptionsChanged(): void {
    this.reteno.setInitOptions({
      pauseInAppMessages: this.initPauseInAppMessages,
      pausePushInAppMessages: this.initPausePushInAppMessages,
      isAutomaticScreenReportingEnabled: this.initScreenReporting,
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

  private syncInitOptions(): void {
    const options = this.reteno.getInitOptions();
    this.initPauseInAppMessages = options.pauseInAppMessages;
    this.initPausePushInAppMessages = options.pausePushInAppMessages;
    this.initScreenReporting = options.isAutomaticScreenReportingEnabled;
    this.initLifecycleApp = options.lifecycleTrackingOptions.appLifecycleEnabled;
    this.initLifecyclePush = options.lifecycleTrackingOptions.pushSubscriptionEnabled;
    this.initLifecycleSession = options.lifecycleTrackingOptions.sessionEventsEnabled;
  }
}
