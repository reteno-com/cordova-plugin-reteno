import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AppVersionBadgeComponent } from '../components/app-version-badge/app-version-badge.component';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  imports: [IonicModule, RouterModule, AppVersionBadgeComponent],
})
export class MainPage implements OnInit {
  private readonly reteno = inject(RetenoService);
  initPauseInAppMessages = false;
  initPausePushInAppMessages = false;
  initLifecycleApp = true;
  initLifecyclePush = true;
  initLifecycleSession = true;
  initialized = false;

  ngOnInit(): void {
    this.reteno.requestNotificationPermission().catch(() => {});
    this.syncInitOptions();
  }

  ionViewDidEnter(): void {
    this.initialized = this.reteno.isInitialized();
  }

  onInitOptionsChanged(): void {
    this.reteno.setInitOptions({
      pauseInAppMessages: this.initPauseInAppMessages,
      pausePushInAppMessages: this.initPausePushInAppMessages,
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
    this.initLifecycleApp = options.lifecycleTrackingOptions.appLifecycleEnabled;
    this.initLifecyclePush = options.lifecycleTrackingOptions.pushSubscriptionEnabled;
    this.initLifecycleSession = options.lifecycleTrackingOptions.sessionEventsEnabled;
  }
}
