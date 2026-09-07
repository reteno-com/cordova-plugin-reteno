# Ecommerce Activity Tracking

Reteno tracks ecommerce activity using `logEcommerceEvent(...)`.

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

## Product viewed

```js
RetenoPlugin.logEcommerceEvent({
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

```js
RetenoPlugin.logEcommerceEvent({
  eventType: 'productCategoryViewed',
  category: {
    productCategoryId: 'CATEGORY-01',
    attributes: [{ name: 'gender', value: ['women'] }],
  },
});
```

## Product added to wishlist

```js
RetenoPlugin.logEcommerceEvent({
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

```js
RetenoPlugin.logEcommerceEvent({
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

```js
RetenoPlugin.logEcommerceEvent({
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

```js
RetenoPlugin.logEcommerceEvent({
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

For these event types the payload requires `externalOrderId` (not full `order` object):

```js
RetenoPlugin.logEcommerceEvent({
  eventType: 'orderDelivered',
  externalOrderId: 'ORD-789',
});

RetenoPlugin.logEcommerceEvent({
  eventType: 'orderCancelled',
  externalOrderId: 'ORD-789',
});
```

## Search request

```js
RetenoPlugin.logEcommerceEvent({
  eventType: 'searchRequest',
  search: 'red t-shirt',
  isFound: true,
});
```

Use valid [ISO-4217](https://en.wikipedia.org/wiki/ISO_4217) currency codes.
