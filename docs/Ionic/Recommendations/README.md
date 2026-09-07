# Recommendations

## Get recommendations

```ts
const result = await this.reteno.getRecommendations({
  recomVariantId: 'variant-id',
  productIds: ['product-1', 'product-2'],
  fields: ['name', 'price', 'image', 'link'],
});

console.log(result.recoms);
```

Category-based:

```ts
await this.reteno.getRecommendations({
  recomVariantId: 'variant-id',
  categoryId: 'category-1',
  fields: ['name', 'price'],
});
```

With filters (accepts a single filter object or an array):

```ts
await this.reteno.getRecommendations({
  recomVariantId: 'variant-id',
  productIds: ['product-1'],
  fields: ['name', 'price'],
  filters: [{ name: 'category', values: ['shoes', 'boots'] }],
});
```

## Log recommendation events

```ts
await this.reteno.logRecommendations({
  recomVariantId: 'variant-id',
  recomEvents: [
    { recomEventType: 'IMPRESSIONS', occurred: new Date().toISOString(), productId: 'product-1' },
    { recomEventType: 'CLICKS', occurred: new Date().toISOString(), productId: 'product-2' },
  ],
});
```
