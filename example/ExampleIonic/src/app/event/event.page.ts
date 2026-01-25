import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-event',
  templateUrl: 'event.page.html',
  styleUrls: ['event.page.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class EventPage implements OnInit {
  status: string | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);

  form = this.formBuilder.group({
    eventName: this.formBuilder.control<string>('purchase', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    date: this.formBuilder.control<string>(new Date().toISOString(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    paramKey: this.formBuilder.control<string>('orderId'),
    paramValue: this.formBuilder.control<string>('A-123'),
  });

  ngOnInit(): void {}

  ionViewDidEnter(): void {
    this.reteno.logScreenView('Log event').catch(() => {});
  }

  sendForm() {
    const v = this.form.getRawValue();
    const clean = (value: string | null | undefined): string | null => {
      if (value == null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const eventName = clean(v.eventName);
    if (!eventName) {
      this.status = 'Please provide eventName.';
      return;
    }

    const date = clean(v.date) ?? new Date().toISOString();
    if (!v.date) {
      this.form.controls.date.setValue(date);
    }

    const payload: {
      eventName: string;
      date: string;
      parameters?: Array<{ name: string; value: string }>;
    } = {
      eventName,
      date,
    };

    const paramKey = clean(v.paramKey);
    const paramValue = clean(v.paramValue);
    if (paramKey && paramValue) {
      payload.parameters = [{ name: paramKey, value: paramValue }];
    }

    this.sendToReteno(payload);
  }

  private async sendToReteno(payload: unknown) {
    this.status = 'Sending…';
    try {
      await this.reteno.logEvent(payload);
      this.status = 'logEvent: OK';
    } catch (err) {
      this.status = 'logEvent: ERROR (see console)';
      // eslint-disable-next-line no-console
      console.error('logEvent: ERROR', err);
    }
  }

  sendForcePushData() {
    this.status = 'Sending…';
    this.reteno
      .forcePushData()
      .then(() => {
        this.status = 'forcePushData: OK';
      })
      .catch((err) => {
        this.status = 'forcePushData: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('forcePushData: ERROR', err);
      });
  }
}
