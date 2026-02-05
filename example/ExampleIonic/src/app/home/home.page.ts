
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

@Component({
    selector: 'app-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
    imports: [IonicModule, ReactiveFormsModule]
})
export class HomePage implements OnInit {
  status: string | null = null;
  isAnonymous = false;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);

  form = this.formBuilder.group({
    multiAccount: this.formBuilder.control<boolean>(false),
    anonymousUser: this.formBuilder.control<boolean>(false),
    externalUserId: this.formBuilder.control<string>('demo_user_123', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    email: this.formBuilder.control<string>('john.doe@example.com'),
    phone: this.formBuilder.control<string>('+380671234567'),
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

  ngOnInit(): void {
    this.form.controls.multiAccount.valueChanges.subscribe(() => {
      this.updateUserMode('multi');
    });
    this.form.controls.anonymousUser.valueChanges.subscribe(() => {
      this.updateUserMode('anonymous');
    });

    this.updateUserMode();
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

    const externalUserId = clean(v.externalUserId);
    if (!this.isAnonymous && !externalUserId) {
      this.status = 'Please provide externalUserId.';
      return;
    }

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

    const email = this.isAnonymous ? null : clean(v.email);
    if (email) userAttributes.email = email;

    const phone = this.isAnonymous ? null : clean(v.phone);
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

    const isMultiAccount = !!v.multiAccount;

    if (this.isAnonymous) {
      this.sendToReteno('setAnonymousUserAttributes', userAttributes);
      return;
    }

    const user = Object.keys(userAttributes).length > 0 ? { userAttributes } : null;
    const payload = {
      externalUserId,
      user,
    };

    if (isMultiAccount) {
      this.sendToReteno('setMultiAccountUserAttributes', {
        externalUserId,
        user: { userAttributes },
      });
      return;
    }

    this.sendToReteno('setUserAttributes', payload);
  }

  private async sendToReteno(method: 'setUserAttributes' | 'setMultiAccountUserAttributes' | 'setAnonymousUserAttributes', payload: unknown) {
    this.status = 'Sending…';
    try {
      if (method === 'setAnonymousUserAttributes') {
        await this.reteno.setAnonymousUserAttributes(payload);
      } else if (method === 'setMultiAccountUserAttributes') {
        await this.reteno.setMultiAccountUserAttributes(payload);
      } else {
        await this.reteno.setUserAttributes(payload);
      }
      this.status = `${method}: OK`;
    } catch (err) {
      this.status = `${method}: ERROR (see console)`;
      // eslint-disable-next-line no-console
      console.error(`${method}: ERROR`, err);
    }
  }

  private updateUserMode(origin?: 'multi' | 'anonymous') {
    const multiControl = this.form.controls.multiAccount;
    const anonymousControl = this.form.controls.anonymousUser;
    const externalUserIdControl = this.form.controls.externalUserId;
    const emailControl = this.form.controls.email;
    const phoneControl = this.form.controls.phone;

    if (origin === 'multi' && multiControl.value && anonymousControl.value) {
      anonymousControl.setValue(false, { emitEvent: false });
    }
    if (origin === 'anonymous' && anonymousControl.value && multiControl.value) {
      multiControl.setValue(false, { emitEvent: false });
    }

    this.isAnonymous = !!anonymousControl.value;

    if (this.isAnonymous) {
      externalUserIdControl.clearValidators();
      externalUserIdControl.disable({ emitEvent: false });
      emailControl.disable({ emitEvent: false });
      phoneControl.disable({ emitEvent: false });
    } else {
      externalUserIdControl.setValidators([Validators.required]);
      externalUserIdControl.enable({ emitEvent: false });
      emailControl.enable({ emitEvent: false });
      phoneControl.enable({ emitEvent: false });
    }

    externalUserIdControl.updateValueAndValidity({ emitEvent: false });
  }
}
