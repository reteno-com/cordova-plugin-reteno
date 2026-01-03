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

export type CustomEventParameter = {
  name: string;
  value?: string;
};

export type RequestNotificationPermissionResult = 0 | 1;

export type LifecycleTrackingOptions = 'ALL' | 'NONE' | string;

export type RetenoInitializeOptions = {
  pauseInAppMessages?: boolean;
  pausePushInAppMessages?: boolean;
  lifecycleTrackingOptions?: LifecycleTrackingOptions;
};
