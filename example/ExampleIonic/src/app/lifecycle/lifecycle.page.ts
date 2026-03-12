import { Component, OnInit, inject } from '@angular/core';
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
export class LifecyclePage implements OnInit {
  status: string | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);
  private readonly platform = inject(Platform);

  form = this.formBuilder.group({
    appLifecycleEnabled: this.formBuilder.control<boolean>(true),
    pushSubscriptionEnabled: this.formBuilder.control<boolean>(true),
    sessionEventsEnabled: this.formBuilder.control<boolean>(true),
  });

  ngOnInit(): void {}

  // Screen view is tracked globally in AppComponent.

  save() {
    if (this.platform.is('ios')) {
      this.status = 'iOS: configure lifecycle tracking only in init options.';
      return;
    }

    const v = this.form.getRawValue();
    const options = {
      appLifecycleEnabled: !!v.appLifecycleEnabled,
      pushSubscriptionEnabled: !!v.pushSubscriptionEnabled,
      sessionEventsEnabled: !!v.sessionEventsEnabled,
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
          pushSubscriptionEnabled: true,
          sessionEventsEnabled: true,
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
          pushSubscriptionEnabled: false,
          sessionEventsEnabled: false,
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
