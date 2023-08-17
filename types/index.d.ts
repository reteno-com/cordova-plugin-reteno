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



export interface RetenoPlugin {
    setApiKey (
        apiKey: string,
        success?: () => void,
        error?: (err: string) => void
    ): void

    logEvent(
        eventName: string,
        date: string,
        // date parameter should be in ISO8601 format
        parameters: CustomEventParameter[],
        forcePush?: boolean
    ) : void

    setUserAttributes(
        payload: SetUserAttributesPayload
    ) :void

    setAnonymousUserAttributes(
        payload: User
    ) :void

    getInitialNotification(
        success: (value: object) => void,
        error: (err: string) => void
    ) : void

    setOnRetenoPushReceivedListener (
        success: (value: object) => void,
        error: (err: string) => void
    ) : void

    performRemoteToken(
        apiKey: string,
        success?: () => void,
        error?: (err: string) => void
    ) : void

    setDeviceToken (
        deviceToken: string
    ) : void

    registerApplicationDidBecomeActiveListener(
        fn: () => void,
    ): void
    registerApplicationDidEnterBackgroundListener(
        fn: () => void,
    ): void
}

declare global {
    const RetenoPlugin: RetenoPlugin;
}
