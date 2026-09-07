# App inbox

## Get App Inbox messages

```js
RetenoPlugin.getAppInboxMessages({
  page: 1,
  pageSize: 20,
  status: 'UNOPENED', // optional: OPENED | UNOPENED
})
  .then((result) => {
    console.log('messages:', result.messages);
    console.log('totalPages:', result.totalPages);
  })
  .catch((err) => console.error('getAppInboxMessages: ERROR', err));
```

## Get unread messages count

```js
RetenoPlugin.getAppInboxMessagesCount()
  .then((count) => console.log('Unread messages:', count))
  .catch((err) => console.error('getAppInboxMessagesCount: ERROR', err));
```

## Subscribe to count changes

```js
function onInboxCountChanged(count) {
  console.log('App Inbox count changed:', count);
}

RetenoPlugin.subscribeOnMessagesCountChanged(onInboxCountChanged, (err) => {
  console.error('subscribeOnMessagesCountChanged: ERROR', err);
});

// unsubscribe
RetenoPlugin.unsubscribeMessagesCountChanged();
```

## Mark message as opened

```js
RetenoPlugin.markAsOpened('message-id')
  .then(() => console.log('markAsOpened: OK'))
  .catch((err) => console.error('markAsOpened: ERROR', err));
```

## Mark all messages as opened

```js
RetenoPlugin.markAllMessagesAsOpened()
  .then(() => console.log('markAllMessagesAsOpened: OK'))
  .catch((err) => console.error('markAllMessagesAsOpened: ERROR', err));
```
