import { Component, NgZone, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { AppVersionBadgeComponent } from '../components/app-version-badge/app-version-badge.component';
import { RetenoService } from '../services/reteno.service';

type EventView = {
  key: string;
  text: string;
};

@Component({
  selector: 'app-in-app',
  templateUrl: 'in-app.page.html',
  styleUrls: ['in-app.page.scss'],
  imports: [IonicModule, ReactiveFormsModule, AppHeaderComponent, AppVersionBadgeComponent],
})
export class InAppPage implements OnInit {
  pauseStatus: string | null = null;
  behaviourStatus: string | null = null;
  lifecycleStatus: string | null = null;
  customDataStatus: string | null = null;
  isPaused = false;
  isLifecycleEnabled = false;
  isCustomDataEnabled = false;
  lifecycleEvents: EventView[] = [];
  customDataEvents: EventView[] = [];

  private lifecycleHandler: ((event: Event) => void) | null = null;
  private customDataHandler: ((event: Event) => void) | null = null;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);
  private readonly zone = inject(NgZone);

  form = this.formBuilder.group({
    behaviour: this.formBuilder.control<string>('POSTPONE_IN_APPS', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  ngOnInit(): void {}

  // Screen view is tracked globally in AppComponent.

  togglePause(enabled: boolean) {
    this.isPaused = enabled;
    this.pauseStatus = enabled ? 'Pausing in-app messages...' : 'Resuming in-app messages...';
    this.reteno
      .pauseInAppMessages(enabled)
      .then(() => {
        this.pauseStatus = enabled ? 'pauseInAppMessages: paused' : 'pauseInAppMessages: resumed';
      })
      .catch((err) => {
        this.isPaused = !enabled;
        this.pauseStatus = 'pauseInAppMessages: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('pauseInAppMessages: ERROR', err);
      });
  }

  applyPauseBehaviour() {
    const behaviour = this.form.getRawValue().behaviour?.trim();
    if (!behaviour) {
      this.behaviourStatus = 'Please select pause behaviour.';
      return;
    }

    this.behaviourStatus = 'Applying pause behaviour...';
    this.reteno
      .setInAppMessagesPauseBehaviour(behaviour)
      .then(() => {
        this.behaviourStatus = 'setInAppMessagesPauseBehaviour: OK';
      })
      .catch((err) => {
        this.behaviourStatus = 'setInAppMessagesPauseBehaviour: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('setInAppMessagesPauseBehaviour: ERROR', err);
      });
  }

  toggleLifecycle(enabled: boolean) {
    if (enabled && !this.lifecycleHandler) {
      this.lifecycleStatus = 'Listening for in-app lifecycle events...';
      this.lifecycleHandler = this.reteno.setOnInAppLifecycleCallback((payload) => {
        this.zone.run(() => {
          const message = this.buildLifecycleMessage(payload);
          this.addEvent(this.lifecycleEvents, 'lifecycle', payload, message);
        });
      });
      this.isLifecycleEnabled = true;
      return;
    }

    if (!enabled && this.lifecycleHandler) {
      this.reteno.removeOnInAppLifecycleCallback(this.lifecycleHandler);
      this.lifecycleHandler = null;
      this.isLifecycleEnabled = false;
      this.lifecycleStatus = 'In-app lifecycle listener removed.';
    }
  }

  toggleCustomData(enabled: boolean) {
    if (enabled && !this.customDataHandler) {
      this.customDataStatus = 'Listening for in-app custom data events...';
      this.customDataHandler = this.reteno.setOnInAppMessageCustomDataReceivedListener((payload) => {
        this.zone.run(() => {
          const message = this.buildCustomDataMessage(payload);
          this.addEvent(this.customDataEvents, 'customData', payload, message);
        });
      });
      this.isCustomDataEnabled = true;
      return;
    }

    if (!enabled && this.customDataHandler) {
      this.reteno.removeOnInAppMessageCustomDataReceivedListener(this.customDataHandler);
      this.customDataHandler = null;
      this.isCustomDataEnabled = false;
      this.customDataStatus = 'In-app custom data listener removed.';
    }
  }

  private buildLifecycleMessage(payload: unknown): string {
    const data = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const eventName = data['event'] != null ? String(data['event']) : 'lifecycle';
    const details = this.safeStringify(payload);
    return `In-app ${eventName}: ${details}`;
  }

  private buildCustomDataMessage(payload: unknown): string {
    return `In-app custom data: ${this.safeStringify(payload)}`;
  }

  private addEvent(list: EventView[], label: string, payload: unknown, text: string): void {
    const key = this.buildEventKey(label, payload, text);
    if (list.some((item) => item.key === key)) {
      return;
    }
    list.unshift({ key, text });
  }

  private buildEventKey(label: string, payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object') {
      const data = payload as Record<string, unknown>;
      const eventName = data['event'] != null ? String(data['event']) : '';
      const nested = data['data'] && typeof data['data'] === 'object' ? (data['data'] as Record<string, unknown>) : null;
      const candidate = nested && nested['id'] != null ? String(nested['id']) : null;
      if (candidate) {
        return `${label}:${eventName}:${candidate}`;
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
