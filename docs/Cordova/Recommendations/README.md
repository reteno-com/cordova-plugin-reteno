# Recommendations

## Get recommendations

```js
RetenoPlugin.getRecommendations({
  recomVariantId: 'variant-id',
  productIds: ['product-1', 'product-2'],
  fields: ['name', 'price', 'image', 'link'],
})
  .then((result) => {
    result.recoms.forEach((item) => {
      console.log(item.productId, item.name);
    });
  })
  .catch((err) => console.error('getRecommendations: ERROR', err));
```

Category-based example:

```js
RetenoPlugin.getRecommendations({
  recomVariantId: 'variant-id',
  categoryId: 'category-1',
  fields: ['name', 'price'],
});
```

With filters:

```js
RetenoPlugin.getRecommendations({
  recomVariantId: 'variant-id',
  productIds: ['product-1'],
  fields: ['name', 'price'],
  filters: [{ name: 'category', values: ['shoes', 'boots'] }],
})
  .then((result) => console.log('getRecommendations: OK', result))
  .catch((err) => console.error('getRecommendations: ERROR', err));
```

## Log recommendation events

```js
RetenoPlugin.logRecommendations({
  recomVariantId: 'variant-id',
  recomEvents: [
    {
      recomEventType: 'IMPRESSIONS',
      occurred: new Date().toISOString(),
      productId: 'product-1',
    },
    {
      recomEventType: 'CLICKS',
      occurred: new Date().toISOString(),
      productId: 'product-2',
    },
  ],
})
  .then(() => console.log('logRecommendations: OK'))
  .catch((err) => console.error('logRecommendations: ERROR', err));
```
