
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
    selector: 'app-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
    imports: [IonicModule, ReactiveFormsModule]
})
export class HomePage {
  status: string | null = null;

  form = this.formBuilder.group({
    externalUserId: this.formBuilder.control<string>('demo_user_123', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    email: this.formBuilder.control<string>('john.doe@example.com'),
    phone: this.formBuilder.control<string>('+1234567890'),
    firstName: this.formBuilder.control<string>('John'),
    lastName: this.formBuilder.control<string>('Doe'),
    languageCode: this.formBuilder.control<string>('en'),
    timeZone: this.formBuilder.control<string>('Europe/Kyiv'),
    region: this.formBuilder.control<string>('Kyiv'),
    town: this.formBuilder.control<string>('Kyiv'),
    address: this.formBuilder.control<string>('Main street 1'),
    postcode: this.formBuilder.control<string>('01001'),
    fieldKey: this.formBuilder.control<string>('plan'),
    fieldValue: this.formBuilder.control<string>('premium'),
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly reteno: RetenoService
  ) {}

  sendForm() {
    const v = this.form.getRawValue();
    const payload = {
      externalUserId: v.externalUserId,
      user: {
        userAttributes: {
          email: v.email || null,
          phone: v.phone || null,
          firstName: v.firstName || null,
          lastName: v.lastName || null,
          languageCode: v.languageCode || null,
          timeZone: v.timeZone || null,
          address:
            v.region || v.town || v.address || v.postcode
              ? {
                  region: v.region || null,
                  town: v.town || null,
                  address: v.address || null,
                  postcode: v.postcode || null,
                }
              : null,
          fields:
            v.fieldKey && v.fieldValue
              ? [{ key: v.fieldKey, value: v.fieldValue }]
              : null,
        },
      },
    };

    this.sendToReteno(payload);
  }

  private async sendToReteno(payload: unknown) {
    this.status = 'Sending…';
    try {
      await this.reteno.setUserAttributes(payload);
      this.status = 'setUserAttributes: OK';
    } catch (err) {
      this.status = 'setUserAttributes: ERROR (see console)';
      // eslint-disable-next-line no-console
      console.error('setUserAttributes: ERROR', err);
    }
  }
}
