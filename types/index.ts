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

export type UserAttributes = {
    phone?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    languageCode?: string | null;
    timeZone?: string | null;
    address?: Address | null;
    fields?: Fields | null;
};

export type User = {
    userAttributes?: UserAttributes | null;
    subscriptionKeys?: String[] | null;
    groupNamesInclude?: String[] | null;
    groupNamesExclude?: String[] | null;
};

export type SetUserAttributesPayload = {
    externalUserId: string;
    user: User;
};

export type CustomEventParameter = {
    name: string;
    value?: string;
};