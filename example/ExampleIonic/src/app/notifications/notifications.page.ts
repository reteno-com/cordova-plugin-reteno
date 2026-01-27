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
}
