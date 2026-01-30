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
  lifecycleTrackingOptions?: LifecycleTrackingOptions;
};

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
