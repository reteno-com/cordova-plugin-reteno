
import { Component, inject } from '@angular/core';
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

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);

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

  sendForm() {
    const v = this.form.getRawValue();
    const clean = (value: string | null | undefined): string | null => {
      if (value == null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    type UserAttributes = {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      languageCode?: string;
      timeZone?: string;
      address?: {
        region?: string;
        town?: string;
        address?: string;
        postcode?: string;
      };
      fields?: Array<{ key: string; value: string }>;
    };

    const userAttributes: UserAttributes = {};

    const email = clean(v.email);
    if (email) userAttributes.email = email;

    const phone = clean(v.phone);
    if (phone) userAttributes.phone = phone;

    const firstName = clean(v.firstName);
    if (firstName) userAttributes.firstName = firstName;

    const lastName = clean(v.lastName);
    if (lastName) userAttributes.lastName = lastName;

    const languageCode = clean(v.languageCode);
    if (languageCode) userAttributes.languageCode = languageCode;

    const timeZone = clean(v.timeZone);
    if (timeZone) userAttributes.timeZone = timeZone;

    const region = clean(v.region);
    const town = clean(v.town);
    const addressLine = clean(v.address);
    const postcode = clean(v.postcode);
    if (region || town || addressLine || postcode) {
      const address: NonNullable<UserAttributes['address']> = {};
      if (region) address.region = region;
      if (town) address.town = town;
      if (addressLine) address.address = addressLine;
      if (postcode) address.postcode = postcode;
      userAttributes.address = address;
    }

    const fieldKey = clean(v.fieldKey);
    const fieldValue = clean(v.fieldValue);
    if (fieldKey && fieldValue) {
      userAttributes.fields = [{ key: fieldKey, value: fieldValue }];
    }

    const user = Object.keys(userAttributes).length > 0 ? { userAttributes } : null;

    const payload = {
      externalUserId: v.externalUserId,
      user,
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
