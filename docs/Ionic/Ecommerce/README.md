# Ecommerce Activity Tracking

Use `logEcommerceEvent(...)`.

Supported `eventType` values:

- `productViewed`
- `productCategoryViewed`
- `productAddedToWishlist`
- `cartUpdated`
- `orderCreated`
- `orderUpdated`
- `orderDelivered`
- `orderCancelled`
- `searchRequest`

`currencyCode` should use ISO 4217 format (for example: `USD`, `EUR`, `GBP`).

## Product viewed

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'productViewed',
  product: {
    productId: 'SKU-123',
    price: 29.99,
    isInStock: true,
    attributes: [{ name: 'color', value: ['red', 'blue'] }],
  },
  currencyCode: 'USD',
});
```

## Product category viewed

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'productCategoryViewed',
  category: {
    productCategoryId: 'CATEGORY-01',
    attributes: [{ name: 'gender', value: ['women'] }],
  },
});
```

## Product added to wishlist

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'productAddedToWishlist',
  product: {
    productId: 'SKU-123',
    price: 29.99,
    isInStock: true,
    attributes: [{ name: 'color', value: ['red'] }],
  },
  currencyCode: 'USD',
});
```

## Cart updated

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'cartUpdated',
  cartId: 'cart-456',
  products: [
    {
      productId: 'SKU-123',
      quantity: 2,
      price: 29.99,
      name: 'T-Shirt',
      category: 'Apparel',
    },
  ],
  currencyCode: 'USD',
});
```

## Order created

`status` accepts `'INITIALIZED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED'` (plus any custom string).

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'orderCreated',
  order: {
    externalOrderId: 'ORD-789',
    totalCost: 59.98,
    status: 'INITIALIZED',
    date: new Date().toISOString(),
    items: [
      {
        externalItemId: 'SKU-123',
        name: 'T-Shirt',
        category: 'Apparel',
        quantity: 2,
        cost: 29.99,
        url: 'https://example.com/products/SKU-123',
      },
    ],
  },
  currencyCode: 'USD',
});
```

## Order updated

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'orderUpdated',
  order: {
    externalOrderId: 'ORD-789',
    totalCost: 59.98,
    status: 'IN_PROGRESS',
    date: new Date().toISOString(),
  },
  currencyCode: 'USD',
});
```

## Order delivered / cancelled

For these event types use `externalOrderId` (not full `order` object):

```ts
await this.reteno.logEcommerceEvent({ eventType: 'orderDelivered', externalOrderId: 'ORD-789' });
await this.reteno.logEcommerceEvent({ eventType: 'orderCancelled', externalOrderId: 'ORD-789' });
```

## Search request

```ts
await this.reteno.logEcommerceEvent({
  eventType: 'searchRequest',
  search: 'red t-shirt',
  isFound: true,
});
```
