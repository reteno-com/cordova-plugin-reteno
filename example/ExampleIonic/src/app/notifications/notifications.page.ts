import { Component, NgZone, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-notifications',
  templateUrl: 'notifications.page.html',
  styleUrls: ['notifications.page.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class NotificationsPage implements OnInit {
  status: string | null = null;
  pushListenerStatus: string | null = null;
  clickListenerStatus: string | null = null;
  pushReceivedEvents: { key: string; text: string }[] = [];
  notificationClickedEvents: { key: string; text: string }[] = [];
  isPushListenerEnabled = false;
  isNotificationClickListenerEnabled = false;

  private pushListenerHandler: ((event: Event) => void) | null = null;
  private clickListenerHandler: ((event: Event) => void) | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);
  private readonly zone = inject(NgZone);

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

  ngOnInit(): void {}

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
