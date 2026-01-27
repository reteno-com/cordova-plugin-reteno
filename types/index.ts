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
