import { Component, NgZone, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { IonicModule, Platform } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-notifications',
  templateUrl: 'notifications.page.html',
  styleUrls: ['notifications.page.scss'],
  imports: [IonicModule, ReactiveFormsModule, AppHeaderComponent],
})
export class NotificationsPage implements OnInit {
  status: string | null = null;
  pushListenerStatus: string | null = null;
  clickListenerStatus: string | null = null;
  iosNotificationStatus: string | null = null;
  pushReceivedEvents: { key: string; text: string }[] = [];
  notificationClickedEvents: { key: string; text: string }[] = [];
  pushDismissedEvents: { key: string; text: string }[] = [];
  customPushReceivedEvents: { key: string; text: string }[] = [];
  pushButtonClickedEvents: { key: string; text: string }[] = [];
  isPushListenerEnabled = false;
  isNotificationClickListenerEnabled = false;
  isPushDismissedListenerEnabled = false;
  isCustomPushReceivedListenerEnabled = false;
  isPushButtonClickedListenerEnabled = false;
  pushDismissedListenerStatus: string | null = null;
  customPushReceivedListenerStatus: string | null = null;
  pushButtonClickedListenerStatus: string | null = null;
  isWillPresentEnabled = false;
  isWillPresentEmitEnabled = false;
  isDidReceiveEnabled = false;
  isDidReceiveEmitEnabled = false;
  isIos = false;

  private pushListenerHandler: ((event: Event) => void) | null = null;
  private clickListenerHandler: ((event: Event) => void) | null = null;
  private pushDismissedListenerHandler: ((event: Event) => void) | null = null;
  private customPushReceivedListenerHandler: ((event: Event) => void) | null = null;
  private pushButtonClickedListenerHandler: ((event: Event) => void) | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);
  private readonly zone = inject(NgZone);
  private readonly platform = inject(Platform);

  form = this.formBuilder.group({
    name: this.formBuilder.control<string>('Updates', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    description: this.formBuilder.control<string>('General updates and announcements', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.isIos = this.platform.is('ios');
  }

  // Screen view is tracked globally in AppComponent.

  apply() {
    const v = this.form.getRawValue();
    const name = v.name?.trim();
    const description = v.description?.trim();
    if (!name || !description) {
      this.status = 'Please provide name and description.';
      return;
    }

    this.status = 'Applying...';
    this.reteno
      .updateDefaultNotificationChannel({ name, description })
      .then(() => {
        this.status = 'updateDefaultNotificationChannel: OK';
      })
      .catch((err) => {
        this.status = 'updateDefaultNotificationChannel: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('updateDefaultNotificationChannel: ERROR', err);
      });
  }

  togglePushListener(enabled: boolean) {
    if (enabled && !this.pushListenerHandler) {
      this.pushListenerStatus = 'Listening for push received events...';
      this.pushListenerHandler = this.reteno.setOnRetenoPushReceivedListener((payload) => {
        this.zone.run(() => {
          const message = this.buildEventMessage('Push received', payload);
          // this.pushListenerStatus = message;
          this.addEvent(this.pushReceivedEvents, 'Push received', payload, message);
        });
      });
      this.isPushListenerEnabled = true;
      return;
    }

    if (!enabled && this.pushListenerHandler) {
      this.reteno.removeOnRetenoPushReceivedListener(this.pushListenerHandler);
      this.pushListenerHandler = null;
      this.isPushListenerEnabled = false;
      this.pushListenerStatus = 'Push received listener removed.';
    }
  }

  toggleNotificationClickListener(enabled: boolean) {
    if (enabled && !this.clickListenerHandler) {
      this.clickListenerStatus = 'Listening for notification click events...';
      this.clickListenerHandler = this.reteno.setOnRetenoNotificationClickedListener((payload) => {
        this.zone.run(() => {
          const message = this.buildEventMessage('Notification clicked', payload);
          // this.clickListenerStatus = message;
          this.addEvent(this.notificationClickedEvents, 'Notification clicked', payload, message);
        });
      });
      this.isNotificationClickListenerEnabled = true;
      return;
    }

    if (!enabled && this.clickListenerHandler) {
      this.reteno.removeOnRetenoNotificationClickedListener(this.clickListenerHandler);
      this.clickListenerHandler = null;
      this.isNotificationClickListenerEnabled = false;
      this.clickListenerStatus = 'Notification click listener removed.';
    }
  }

  togglePushDismissedListener(enabled: boolean) {
    if (enabled && !this.pushDismissedListenerHandler) {
      this.pushDismissedListenerStatus = 'Listening for push dismissed events...';
      this.pushDismissedListenerHandler = this.reteno.setOnRetenoPushDismissedListener((payload) => {
        this.zone.run(() => {
          const message = this.buildEventMessage('Push dismissed', payload);
          this.addEvent(this.pushDismissedEvents, 'Push dismissed', payload, message);
        });
      });
      this.isPushDismissedListenerEnabled = true;
      return;
    }

    if (!enabled && this.pushDismissedListenerHandler) {
      this.reteno.removeOnRetenoPushDismissedListener(this.pushDismissedListenerHandler);
      this.pushDismissedListenerHandler = null;
      this.isPushDismissedListenerEnabled = false;
      this.pushDismissedListenerStatus = 'Push dismissed listener removed.';
    }
  }

  toggleCustomPushReceivedListener(enabled: boolean) {
    if (enabled && !this.customPushReceivedListenerHandler) {
      this.customPushReceivedListenerStatus = 'Listening for custom push received events...';
      this.customPushReceivedListenerHandler = this.reteno.setOnRetenoCustomPushReceivedListener((payload) => {
        this.zone.run(() => {
          const message = this.buildEventMessage('Custom push received', payload);
          this.addEvent(this.customPushReceivedEvents, 'Custom push received', payload, message);
        });
      });
      this.isCustomPushReceivedListenerEnabled = true;
      return;
    }

    if (!enabled && this.customPushReceivedListenerHandler) {
      this.reteno.removeOnRetenoCustomPushReceivedListener(this.customPushReceivedListenerHandler);
      this.customPushReceivedListenerHandler = null;
      this.isCustomPushReceivedListenerEnabled = false;
      this.customPushReceivedListenerStatus = 'Custom push received listener removed.';
    }
  }

  togglePushButtonClickedListener(enabled: boolean) {
    if (enabled && !this.pushButtonClickedListenerHandler) {
      this.pushButtonClickedListenerStatus = 'Listening for push button clicked events...';
      // Enable native action handler with event emission
      this.reteno.setNotificationActionHandler({ enabled: true, emitEvent: true }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('setNotificationActionHandler: ERROR', err);
      });
      this.pushButtonClickedListenerHandler = this.reteno.setOnRetenoPushButtonClickedListener((payload) => {
        this.zone.run(() => {
          const message = this.buildEventMessage('Push button clicked', payload);
          this.addEvent(this.pushButtonClickedEvents, 'Push button clicked', payload, message);
        });
      });
      this.isPushButtonClickedListenerEnabled = true;
      return;
    }

    if (!enabled && this.pushButtonClickedListenerHandler) {
      this.reteno.removeOnRetenoPushButtonClickedListener(this.pushButtonClickedListenerHandler);
      this.pushButtonClickedListenerHandler = null;
      this.isPushButtonClickedListenerEnabled = false;
      this.pushButtonClickedListenerStatus = 'Push button clicked listener removed.';
      // Disable native action handler
      this.reteno.setNotificationActionHandler(false).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('setNotificationActionHandler: ERROR', err);
      });
    }
  }
  toggleWillPresent(enabled: boolean) {
    this.isWillPresentEnabled = enabled;
    this.applyWillPresent();
  }

  toggleWillPresentEmit(enabled: boolean) {
    this.isWillPresentEmitEnabled = enabled;
    this.applyWillPresent();
  }

  toggleDidReceive(enabled: boolean) {
    this.isDidReceiveEnabled = enabled;
    this.applyDidReceive();
  }

  toggleDidReceiveEmit(enabled: boolean) {
    this.isDidReceiveEmitEnabled = enabled;
    this.applyDidReceive();
  }

  private applyWillPresent() {
    const payload = this.isWillPresentEnabled
      ? { options: ['badge', 'sound', 'banner'], emitEvent: this.isWillPresentEmitEnabled }
      : null;
    this.iosNotificationStatus = 'setWillPresentNotificationOptions: applying...';
    this.reteno
      .setWillPresentNotificationOptions(payload)
      .then(() => {
        this.iosNotificationStatus = this.isWillPresentEnabled
          ? 'setWillPresentNotificationOptions: enabled'
          : 'setWillPresentNotificationOptions: removed';
      })
      .catch((err) => {
        this.iosNotificationStatus = 'setWillPresentNotificationOptions: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('setWillPresentNotificationOptions: ERROR', err);
      });
  }

  private applyDidReceive() {
    const payload = { enabled: this.isDidReceiveEnabled, emitEvent: this.isDidReceiveEmitEnabled };
    this.iosNotificationStatus = 'setDidReceiveNotificationResponseHandler: applying...';
    this.reteno
      .setDidReceiveNotificationResponseHandler(payload)
      .then(() => {
        this.iosNotificationStatus = this.isDidReceiveEnabled
          ? 'setDidReceiveNotificationResponseHandler: enabled'
          : 'setDidReceiveNotificationResponseHandler: removed';
      })
      .catch((err) => {
        this.iosNotificationStatus = 'setDidReceiveNotificationResponseHandler: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('setDidReceiveNotificationResponseHandler: ERROR', err);
      });
  }

  private buildEventMessage(label: string, payload: unknown): string {
    const dateText = this.extractDate(payload);
    const details = this.safeStringify(payload);
    if (dateText) {
      return `${label} event (${dateText}): ${details}`;
    }
    return `${label} event: ${details}`;
  }

  private extractDate(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const data = payload as Record<string, unknown>;
    const candidate =
      data['date'] ??
      data['timestamp'] ??
      data['sentTime'] ??
      data['sendTime'] ??
      data['sent_time'] ??
      data['receivedAt'] ??
      data['received_at'] ??
      data['pushDate'] ??
      data['pushTime'];
    if (candidate == null) {
      return null;
    }
    if (typeof candidate === 'number') {
      return new Date(candidate).toISOString();
    }
    if (typeof candidate === 'string') {
      const parsed = Date.parse(candidate);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
      return candidate;
    }
    return null;
  }

  private addEvent(
    list: { key: string; text: string }[],
    label: string,
    payload: unknown,
    text: string
  ): void {
    const key = this.buildEventKey(label, payload, text);
    if (list.some((item) => item.key === key)) {
      return;
    }
    list.unshift({ key, text });
  }

  private buildEventKey(label: string, payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object') {
      const data = payload as Record<string, unknown>;
      const candidate =
        data['id'] ??
        data['messageId'] ??
        data['message_id'] ??
        data['es_interaction_id'] ??
        data['interactionId'] ??
        data['notificationId'] ??
        data['notification_id'] ??
        data['pushId'] ??
        data['push_id'];
      if (candidate != null) {
        return `${label}:${String(candidate)}`;
      }
    }
    return `${label}:${fallback}`;
  }

  private safeStringify(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch (err) {
      return String(payload);
    }
  }
}
