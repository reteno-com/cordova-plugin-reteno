import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { AppVersionBadgeComponent } from '../components/app-version-badge/app-version-badge.component';
import { RetenoService } from '../services/reteno.service';

type EcommerceEventType =
  | 'productViewed'
  | 'productCategoryViewed'
  | 'productAddedToWishlist'
  | 'cartUpdated'
  | 'orderCreated'
  | 'orderUpdated'
  | 'orderDelivered'
  | 'orderCancelled'
  | 'searchRequest';

@Component({
  selector: 'app-ecommerce-events',
  templateUrl: 'ecommerce-events.page.html',
  styleUrls: ['ecommerce-events.page.scss'],
  imports: [IonicModule, AppHeaderComponent, AppVersionBadgeComponent],
})
export class EcommerceEventsPage implements OnInit {
  status: string | null = null;

  private readonly reteno = inject(RetenoService);

  ngOnInit(): void {}

  // Screen view is tracked globally in AppComponent.

  logEcommerceEvent(eventType: EcommerceEventType) {
    const payload = this.buildPayload(eventType);

    this.status = `Logging ecommerce event: ${eventType}...`;
    this.reteno
      .logEcommerceEvent(payload)
      .then(() => {
        this.status = `logEcommerceEvent: OK (${eventType})`;
      })
      .catch((err) => {
        this.status = 'logEcommerceEvent: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('logEcommerceEvent: ERROR', err);
      });
  }

  private buildPayload(eventType: EcommerceEventType): Record<string, unknown> {
    const occurred = new Date().toISOString();
    let payload: Record<string, unknown>;
    switch (eventType) {
      case 'productCategoryViewed':
        payload = {
          eventType,
          category: {
            productCategoryId: 'category-1',
            attributes: [{ name: 'department', value: ['shoes'] }],
          },
          occurred,
        };
        break;
      case 'productAddedToWishlist':
        payload = {
          eventType,
          product: {
            productId: 'sku-2',
            price: 149.99,
            isInStock: true,
            attributes: [{ name: 'color', value: ['blue'] }],
          },
          currencyCode: 'USD',
          occurred,
        };
        break;
      case 'cartUpdated':
        payload = {
          eventType,
          cartId: 'cart-123',
          products: [
            {
              productId: 'sku-1',
              quantity: 2,
              price: 89.5,
              discount: 10,
              name: 'Sneakers',
              category: 'Shoes',
              attributes: [{ name: 'size', value: ['42'] }],
            },
          ],
          currencyCode: 'USD',
          occurred,
        };
        break;
      case 'orderCreated':
      case 'orderUpdated':
        payload = {
          eventType,
          order: {
            externalOrderId: 'order-1001',
            externalCustomerId: 'customer-77',
            totalCost: 199.99,
            status: 'IN_PROGRESS',
            date: occurred,
            cartId: 'cart-123',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            items: [
              {
                externalItemId: 'sku-1',
                name: 'Sneakers',
                category: 'Shoes',
                quantity: 1,
                cost: 99.99,
                url: 'https://example.com/products/sku-1',
                imageUrl: 'https://example.com/images/sku-1.png',
              },
            ],
            attributes: [{ key: 'promo', value: 'newyear' }],
          },
          currencyCode: 'USD',
          occurred,
        };
        break;
      case 'orderDelivered':
        payload = {
          eventType,
          externalOrderId: 'order-1001',
          occurred,
        };
        break;
      case 'orderCancelled':
        payload = {
          eventType,
          externalOrderId: 'order-1001',
          occurred,
        };
        break;
      case 'searchRequest':
        payload = {
          eventType,
          search: 'running shoes',
          isFound: true,
          occurred,
        };
        break;
      case 'productViewed':
      default:
        payload = {
          eventType: 'productViewed',
          product: {
            productId: 'sku-1',
            price: 99.99,
            isInStock: true,
            attributes: [{ name: 'color', value: ['red'] }],
          },
          currencyCode: 'USD',
          occurred,
        };
        break;
    }

    return payload;
  }
}
