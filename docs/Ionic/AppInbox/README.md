# App Inbox

## Get App Inbox messages

```ts
const result = await this.reteno.getAppInboxMessages({
  page: 1,
  pageSize: 20,
  status: 'UNOPENED', // optional: 'OPENED' | 'UNOPENED'
});

console.log(result.messages, result.totalPages);
```

Returns `AppInboxMessages`: `{ messages: AppInboxMessage[], totalPages: number }`. Each `AppInboxMessage` contains:

```ts
type AppInboxMessage = {
  id: string;
  title: string;
  createdDate: string;
  isNewMessage: boolean;
  content?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  category?: string | null;
  status?: 'OPENED' | 'UNOPENED' | null;
  customData?: Record<string, string> | null;
};
```

## Get unread messages count

```ts
const count = await this.reteno.getAppInboxMessagesCount();
console.log('Unread messages:', count);
```

## Subscribe to count changes

```ts
this.reteno.subscribeOnMessagesCountChanged().subscribe({
  next: (count) => console.log('App Inbox count changed:', count),
  error: (err) => console.error('subscribeOnMessagesCountChanged:', err),
});

// later
await this.reteno.unsubscribeMessagesCountChanged();
```

## Mark message as opened

```ts
await this.reteno.markAsOpened('message-id');
```

## Mark all messages as opened

```ts
await this.reteno.markAllMessagesAsOpened();
```
