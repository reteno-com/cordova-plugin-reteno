import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-lifecycle',
  templateUrl: 'lifecycle.page.html',
  styleUrls: ['lifecycle.page.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class LifecyclePage implements OnInit {
  status: string | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);

  form = this.formBuilder.group({
    appLifecycleEnabled: this.formBuilder.control<boolean>(true),
    pushSubscriptionEnabled: this.formBuilder.control<boolean>(true),
    sessionEventsEnabled: this.formBuilder.control<boolean>(true),
  });

  ngOnInit(): void {}

  // Screen view is tracked globally in AppComponent.

  save() {
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
}
