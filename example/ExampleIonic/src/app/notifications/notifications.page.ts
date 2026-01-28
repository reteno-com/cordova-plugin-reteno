import { Component, OnInit, inject } from '@angular/core';
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
  pushReceivedEvents: string[] = [];
  notificationClickedEvents: string[] = [];
  isPushListenerEnabled = false;
  isNotificationClickListenerEnabled = false;

  private pushListenerHandler: ((event: Event) => void) | null = null;
  private clickListenerHandler: ((event: Event) => void) | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);

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

  ionViewDidEnter(): void {
    this.reteno.logScreenView('Notifications').catch(() => {});
  }

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
        const message = `Push received event: ${this.safeStringify(payload)}`;
        this.pushListenerStatus = message;
        this.pushReceivedEvents.unshift(message);
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
        const message = `Notification clicked event: ${this.safeStringify(payload)}`;
        this.clickListenerStatus = message;
        this.notificationClickedEvents.unshift(message);
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

  private safeStringify(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch (err) {
      return String(payload);
    }
  }
}
