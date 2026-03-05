export type Address = {
  region?: string | null;
  town?: string | null;
  address?: string | null;
  postcode?: string | null;
};

type Field = {
  key: string;
  value: string;
};

type Fields = Field[];

export type UserAttributesAnonymous = {
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  timeZone?: string | null;
  address?: Address | null;
  fields?: Fields | null;
};

export type UserAttributes = {
  phone?: string | null;
  email?: string | null;
} & UserAttributesAnonymous;

export type User = {
  userAttributes?: UserAttributes | null;
  subscriptionKeys?: string[] | null;
  groupNamesInclude?: string[] | null;
  groupNamesExclude?: string[] | null;
};

export type SetUserAttributesPayload = {
  externalUserId: string;
  user?: User | null;
};

export type SetMultiAccountUserAttributesPayload = {
  externalUserId: string;
  user: User;
};

export type CustomEventParameter = {
  name: string;
  value?: string;
};

export type LogEventPayload = {
  /** Event name as defined in Reteno */
  eventName: string;
  /** ISO 8601 date string; if omitted on Android API 26+ current time is used */
  date?: string | null;
  /** Optional list of parameters */
  parameters?: CustomEventParameter[] | null;
};

export type RequestNotificationPermissionResult = 0 | 1;

export type NotificationPresentationOption = 'badge' | 'sound' | 'alert' | 'banner' | 'list';

export type WillPresentNotificationOptionsPayload = {
  options?: NotificationPresentationOption[];
  presentationOptions?: NotificationPresentationOption[];
  emitEvent?: boolean;
};

export type NotificationResponseHandlerOptions = {
  enabled?: boolean;
  emitEvent?: boolean;
};

export type LifecycleTrackingOptions =
  | {
      appLifecycleEnabled?: boolean | null;
      pushSubscriptionEnabled?: boolean | null;
      sessionEventsEnabled?: boolean | null;
    }
  | 'ALL'
  | 'NONE'
  | string;

export type RetenoInitializeOptions = {
  pauseInAppMessages?: boolean;
  pausePushInAppMessages?: boolean;
  isAutomaticScreenReportingEnabled?: boolean;
  lifecycleTrackingOptions?: LifecycleTrackingOptions;
  /** Enables Reteno debug mode for near real-time event monitoring. Use only with test devices. */
  isDebugMode?: boolean;
};

export type InAppPauseBehaviour = 'SKIP_IN_APPS' | 'POSTPONE_IN_APPS';

export type InAppLifecycleEvent = 'beforeDisplay' | 'onDisplay' | 'beforeClose' | 'afterClose' | 'onError';

export type InAppData = {
  id?: string;
};

export type InAppActionData = {
  isCloseButtonClicked: boolean;
  isButtonClicked: boolean;
  isOpenUrlClicked: boolean;
};

export type InAppCloseData = {
  id?: string;//android only
  closeAction: string;
  action?: InAppActionData;
};

export type InAppErrorData = {
  id?: string;
  errorMessage: string;
};

export type InAppLifecyclePayload = {
  event: InAppLifecycleEvent;
  data: InAppData | InAppCloseData | InAppErrorData;
};

export type InAppLifecycleListener = (payload: InAppLifecyclePayload) => void;

export type InAppStatusHandler = InAppLifecycleListener;

export type NotificationChannelConfig = {
  name: string;
  description: string;
};

export type AppInboxStatus = 'OPENED' | 'UNOPENED';

export type AppInboxMessage = {
  id: string;
  title: string;
  createdDate: string;
  isNewMessage: boolean;
  content?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  category?: string | null;
  status?: AppInboxStatus | null;
  customData?: Record<string, string> | null;
};

export type AppInboxMessages = {
  messages: AppInboxMessage[];
  totalPages: number;
};

export type GetAppInboxMessagesPayload = {
  page: number;
  pageSize: number;
  status?: AppInboxStatus | string | null;
};

export type RecommendationFilter = {
  name: string;
  values: string[];
};

export type GetRecommendationsPayload = {
  recomVariantId: string;
  productIds?: string[] | null;
  categoryId?: string | null;
  fields?: string[] | null;
  filters?: RecommendationFilter | RecommendationFilter[] | null;
};

export type RecommendationItem = {
  productId: string;
} & Record<string, unknown>;

export type RecommendationsResponse<T = RecommendationItem> = {
  recoms: T[];
};

export type RecommendationEventType = 'IMPRESSIONS' | 'CLICKS' | string;

export type RecommendationEvent = {
  recomEventType: RecommendationEventType;
  occurred: string;
  productId: string;
};

export type LogRecommendationsPayload = {
  recomVariantId: string;
  recomEvents: RecommendationEvent[];
};

export type EcommerceDate = string | number;

export type EcommerceAttribute = {
  name: string;
  value: string[];
};

export type ProductView = {
  productId: string;
  price: number;
  isInStock: boolean;
  attributes?: EcommerceAttribute[] | null;
};

export type ProductCategoryView = {
  productCategoryId: string;
  attributes?: EcommerceAttribute[] | null;
};

export type ProductInCart = {
  productId: string;
  quantity: number;
  price: number;
  discount?: number | null;
  name?: string | null;
  category?: string | null;
  attributes?: EcommerceAttribute[] | null;
};

export type OrderItem = {
  externalItemId: string;
  name: string;
  category: string;
  quantity: number;
  cost: number;
  url: string;
  imageUrl?: string | null;
  description?: string | null;
};

export type OrderStatus = 'INITIALIZED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED' | string;

export type OrderAttribute = {
  key: string;
  value: string;
};

export type Order = {
  externalOrderId: string;
  externalCustomerId?: string | null;
  totalCost: number;
  status: OrderStatus;
  date: EcommerceDate;
  cartId?: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  shipping?: number | null;
  discount?: number | null;
  taxes?: number | null;
  restoreUrl?: string | null;
  statusDescription?: string | null;
  storeId?: string | null;
  source?: string | null;
  deliveryMethod?: string | null;
  paymentMethod?: string | null;
  deliveryAddress?: string | null;
  items?: OrderItem[] | null;
  attributes?: OrderAttribute[] | Record<string, string> | null;
};

export type EcommerceEventType =
  | 'productViewed'
  | 'productCategoryViewed'
  | 'productAddedToWishlist'
  | 'cartUpdated'
  | 'orderCreated'
  | 'orderUpdated'
  | 'orderDelivered'
  | 'orderCancelled'
  | 'searchRequest'
  | string;

export type ProductViewedEvent = {
  eventType: 'productViewed';
  product: ProductView;
  currencyCode?: string | null;
  occurred?: EcommerceDate | null;
};

export type ProductCategoryViewedEvent = {
  eventType: 'productCategoryViewed';
  category: ProductCategoryView;
  occurred?: EcommerceDate | null;
};

export type ProductAddedToWishlistEvent = {
  eventType: 'productAddedToWishlist';
  product: ProductView;
  currencyCode?: string | null;
  occurred?: EcommerceDate | null;
};

export type CartUpdatedEvent = {
  eventType: 'cartUpdated';
  cartId: string;
  products: ProductInCart[];
  currencyCode?: string | null;
  occurred?: EcommerceDate | null;
};

export type OrderCreatedEvent = {
  eventType: 'orderCreated';
  order: Order;
  currencyCode?: string | null;
  occurred?: EcommerceDate | null;
};

export type OrderUpdatedEvent = {
  eventType: 'orderUpdated';
  order: Order;
  currencyCode?: string | null;
  occurred?: EcommerceDate | null;
};

export type OrderDeliveredEvent = {
  eventType: 'orderDelivered';
  externalOrderId: string;
  occurred?: EcommerceDate | null;
};

export type OrderCancelledEvent = {
  eventType: 'orderCancelled';
  externalOrderId: string;
  occurred?: EcommerceDate | null;
};

export type SearchRequestEvent = {
  eventType: 'searchRequest';
  search: string;
  isFound?: boolean | null;
  occurred?: EcommerceDate | null;
};

export type LogEcommerceEventPayload =
  | ProductViewedEvent
  | ProductCategoryViewedEvent
  | ProductAddedToWishlistEvent
  | CartUpdatedEvent
  | OrderCreatedEvent
  | OrderUpdatedEvent
  | OrderDeliveredEvent
  | OrderCancelledEvent
  | SearchRequestEvent;

/**
 * Payload received when a push notification is received.
 * Contains the data from the notification bundle.
 */
export type RetenoPushReceivedPayload = Record<string, unknown>;

/**
 * Payload received when a user taps on a push notification.
 * Contains the custom data from the notification.
 */
export type RetenoNotificationClickedPayload = Record<string, unknown>;

/**
 * Listener function for push notification received events.
 */
export type RetenoPushReceivedListener = (payload: RetenoPushReceivedPayload) => void;

/**
 * Listener function for notification clicked events.
 */
export type RetenoNotificationClickedListener = (payload: RetenoNotificationClickedPayload) => void;

/**
 * Payload received when an in-app message button is clicked with custom data.
 * Contains the custom data from the in-app message, including the button URL under the "url" key.
 */
export type RetenoInAppCustomDataPayload = Record<string, unknown>;

/**
 * Listener function for in-app message custom data events.
 */
export type RetenoInAppCustomDataListener = (payload: RetenoInAppCustomDataPayload) => void;

/**
 * Payload received when a push notification is dismissed (swiped away).
 * Available in Reteno Android SDK 2.9.1+.
 */
export type RetenoPushDismissedPayload = Record<string, unknown>;

/**
 * Listener function for push notification dismissed (swipe) events.
 * Available in Reteno Android SDK 2.9.1+.
 */
export type RetenoPushDismissedListener = (payload: RetenoPushDismissedPayload) => void;

/**
 * Payload received when a custom push notification is received.
 * Available in Reteno Android SDK 2.9.1+.
 */
export type RetenoCustomPushReceivedPayload = Record<string, unknown>;

/**
 * Listener function for custom push notification received events.
 * Available in Reteno Android SDK 2.9.1+.
 */
export type RetenoCustomPushReceivedListener = (payload: RetenoCustomPushReceivedPayload) => void;

/**
 * Payload received when a push notification action button is clicked.
 * Contains actionId, link, customData and the original userInfo.
 *
 * - iOS: up to 4 buttons per notification.
 * - Android: up to 3 buttons per notification.
 */
export type RetenoPushButtonClickedPayload = {
  /** The unique identifier of the action button. */
  actionId: string;
  /** The URL or deeplink associated with the button, if any. */
  link?: string | null;
  /**
   * Additional custom data associated with the button.
   * Typically a parsed JSON object. On Android, falls back to a raw string
   * if the value cannot be parsed as JSON.
   */
  customData?: Record<string, unknown> | string | null;
  /** The original notification userInfo / bundle. */
  userInfo?: Record<string, unknown>;
};

/**
 * Listener function for push notification action button click events.
 * Available on iOS and Android.
 */
export type RetenoPushButtonClickedListener = (payload: RetenoPushButtonClickedPayload) => void;
