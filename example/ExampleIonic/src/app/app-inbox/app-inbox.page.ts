import { Component, NgZone, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RetenoService } from '../services/reteno.service';

type InboxMessageView = {
  key: string;
  id: string;
  title: string;
  status?: string;
  createdDate?: string;
};

@Component({
  selector: 'app-app-inbox',
  templateUrl: 'app-inbox.page.html',
  styleUrls: ['app-inbox.page.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class AppInboxPage implements OnInit {
  status: string | null = null;
  countStatus: string | null = null;
  markStatus: string | null = null;
  messages: InboxMessageView[] = [];
  isCountSubscribed = false;

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);
  private readonly zone = inject(NgZone);

  form = this.formBuilder.group({
    page: this.formBuilder.control<number>(1, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    pageSize: this.formBuilder.control<number>(20, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    status: this.formBuilder.control<string>(''),
    messageId: this.formBuilder.control<string>(''),
  });

  ngOnInit(): void {}

  // Screen view is tracked globally in AppComponent.

  fetchMessages() {
    const v = this.form.getRawValue();
    const page = Number(v.page);
    const pageSize = Number(v.pageSize);
    if (!Number.isFinite(page) || page < 1) {
      this.status = 'Please provide a valid page.';
      return;
    }
    if (!Number.isFinite(pageSize) || pageSize < 1) {
      this.status = 'Please provide a valid pageSize.';
      return;
    }

    const payload: { page: number; pageSize: number; status?: string } = {
      page,
      pageSize,
    };
    const statusValue = v.status?.trim();
    if (statusValue) {
      payload.status = statusValue;
    }

    this.status = 'Fetching messages...';
    this.reteno
      .getAppInboxMessages(payload)
      .then((result) => {
        const totalPages =
          result && typeof result === 'object' && 'totalPages' in result
            ? (result as { totalPages?: number }).totalPages
            : undefined;
        const messagesRaw =
          result && typeof result === 'object' && 'messages' in result
            ? (result as { messages?: unknown[] }).messages
            : [];
        this.messages = Array.isArray(messagesRaw)
          ? messagesRaw.map((item, index) => this.buildMessageView(item, index))
          : [];
        this.status = `getAppInboxMessages: OK (totalPages: ${totalPages ?? '?'})`;
      })
      .catch((err) => {
        this.status = 'getAppInboxMessages: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('getAppInboxMessages: ERROR', err);
      });
  }

  fetchCount() {
    this.countStatus = 'Fetching count...';
    this.reteno
      .getAppInboxMessagesCount()
      .then((count) => {
        this.countStatus = `App Inbox count: ${count}`;
      })
      .catch((err) => {
        this.countStatus = 'getAppInboxMessagesCount: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('getAppInboxMessagesCount: ERROR', err);
      });
  }

  toggleCountSubscription(enabled: boolean) {
    if (enabled) {
      this.countStatus = 'Subscribing to count updates...';
      this.reteno
        .subscribeOnMessagesCountChanged((count) => {
          this.zone.run(() => {
            this.countStatus = `App Inbox count: ${count}`;
          });
        })
        .then(() => {
          this.isCountSubscribed = true;
        })
        .catch((err) => {
          this.isCountSubscribed = false;
          this.countStatus = 'subscribeOnMessagesCountChanged: ERROR (see console)';
          // eslint-disable-next-line no-console
          console.error('subscribeOnMessagesCountChanged: ERROR', err);
        });
      return;
    }

    this.reteno
      .unsubscribeMessagesCountChanged()
      .then(() => {
        this.isCountSubscribed = false;
        this.countStatus = 'Unsubscribed from count updates.';
      })
      .catch((err) => {
        this.countStatus = 'unsubscribeMessagesCountChanged: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('unsubscribeMessagesCountChanged: ERROR', err);
      });
  }

  markAsOpened() {
    const messageId = this.form.getRawValue().messageId?.trim();
    if (!messageId) {
      this.markStatus = 'Please provide messageId.';
      return;
    }

    this.markStatus = 'Marking message as opened...';
    this.reteno
      .markAsOpened(messageId)
      .then(() => {
        this.markStatus = 'markAsOpened: OK';
      })
      .catch((err) => {
        this.markStatus = 'markAsOpened: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('markAsOpened: ERROR', err);
      });
  }

  markAllAsOpened() {
    this.markStatus = 'Marking all messages as opened...';
    this.reteno
      .markAllMessagesAsOpened()
      .then(() => {
        this.markStatus = 'markAllMessagesAsOpened: OK';
      })
      .catch((err) => {
        this.markStatus = 'markAllMessagesAsOpened: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('markAllMessagesAsOpened: ERROR', err);
      });
  }

  private buildMessageView(message: unknown, index: number): InboxMessageView {
    const data = message && typeof message === 'object' ? (message as Record<string, unknown>) : {};
    const id = data['id'] != null ? String(data['id']) : `message-${index + 1}`;
    const title = data['title'] != null ? String(data['title']) : '';
    const status = data['status'] != null ? String(data['status']) : undefined;
    const createdDate = data['createdDate'] != null ? String(data['createdDate']) : undefined;
    return {
      key: `${id}:${index}`,
      id,
      title,
      status,
      createdDate,
    };
  }
}
