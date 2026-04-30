import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { IonicModule, Platform } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-lifecycle',
  templateUrl: 'lifecycle.page.html',
  styleUrls: ['lifecycle.page.scss'],
  imports: [IonicModule, ReactiveFormsModule, AppHeaderComponent],
})
export class LifecyclePage {
  status: string | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);
  private readonly platform = inject(Platform);

  form = this.formBuilder.group({
    appLifecycleEnabled: this.formBuilder.control<boolean>(true),
    foregroundLifecycleEnabled: this.formBuilder.control<boolean>(false),
    pushSubscriptionEnabled: this.formBuilder.control<boolean>(true),
    sessionStartEventsEnabled: this.formBuilder.control<boolean>(true),
    sessionEndEventsEnabled: this.formBuilder.control<boolean>(false),
  });

  // Screen view is tracked globally in AppComponent.

  save() {
    if (this.platform.is('ios')) {
      this.status = 'iOS: configure lifecycle tracking only in init options.';
      return;
    }

    const v = this.form.getRawValue();
    const options = {
      appLifecycleEnabled: !!v.appLifecycleEnabled,
      foregroundLifecycleEnabled: !!v.foregroundLifecycleEnabled,
      pushSubscriptionEnabled: !!v.pushSubscriptionEnabled,
      sessionStartEventsEnabled: !!v.sessionStartEventsEnabled,
      sessionEndEventsEnabled: !!v.sessionEndEventsEnabled,
    };

    this.status = 'Saving…';
    this.reteno
      .setLifecycleTrackingOptions(options)
      .then(() => {
        this.status = 'setLifecycleTrackingOptions: OK';
      })
      .catch((err) => {
        this.status = 'setLifecycleTrackingOptions: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('setLifecycleTrackingOptions: ERROR', err);
      });
  }

  setAll() {
    if (this.platform.is('ios')) {
      this.status = 'iOS: configure lifecycle tracking only in init options.';
      return;
    }

    this.status = 'Saving…';
    this.reteno
      .setLifecycleTrackingOptions('ALL')
      .then(() => {
        this.form.patchValue({
          appLifecycleEnabled: true,
          foregroundLifecycleEnabled: true,
          pushSubscriptionEnabled: true,
          sessionStartEventsEnabled: true,
          sessionEndEventsEnabled: true,
        });
        this.status = 'setLifecycleTrackingOptions: OK (ALL)';
      })
      .catch((err) => {
        this.status = 'setLifecycleTrackingOptions: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('setLifecycleTrackingOptions: ERROR', err);
      });
  }

  setNone() {
    if (this.platform.is('ios')) {
      this.status = 'iOS: configure lifecycle tracking only in init options.';
      return;
    }

    this.status = 'Saving…';
    this.reteno
      .setLifecycleTrackingOptions('NONE')
      .then(() => {
        this.form.patchValue({
          appLifecycleEnabled: false,
          foregroundLifecycleEnabled: false,
          pushSubscriptionEnabled: false,
          sessionStartEventsEnabled: false,
          sessionEndEventsEnabled: false,
        });
        this.status = 'setLifecycleTrackingOptions: OK (NONE)';
      })
      .catch((err) => {
        this.status = 'setLifecycleTrackingOptions: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('setLifecycleTrackingOptions: ERROR', err);
      });
  }
}
