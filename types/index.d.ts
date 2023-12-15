export type Address = {
    region?: string | null;
    town?: string | null;
    address?: string | null;
    postcode?: string | null;
};

export type Field = {
    key: string;
    value: string;
};

export type Fields = Field[];

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

export type AnonymousUserAttributes = {
    user: {
        userAttributes: Pick<
            UserAttributes,
            | "firstName"
            | "lastName"
            | "languageCode"
            | "timeZone"
            | "address"
            | "fields"
        >;
    };
};

export type SetUserAttributesPayload = {
    externalUserId: string;
    user: User;
};

export type CustomEventParameter = {
    name: string;
    value?: string;
};

export interface LogEvent {
    eventName: string;
    date: string;
    parameters: CustomEventParameter[];
    forcePush?: boolean;
}

export interface RetenoPlugin {
    /**
     * @deprecated this method of Reteno initialization is deprecated, becuase it led to incorrect initializations of native libraries,
     * please refer to new documentation https://docs.reteno.com/reference/cordova-sdk-setup, IOS and Android SDK Setup sections
     */
    setApiKey(
        apiKey: string,
        success?: () => void,
        error?: (err: string) => void
    ): void;

    /**
     *
     * @param eventName
     * @param date date parameter should be in ISO8601 format
     * @param parameters array of {@link CustomEventParameter}
     * @param forcePush
     */
    logEvent(payload: LogEvent): void;

    setUserAttributes(payload: SetUserAttributesPayload): void;

    setAnonymousUserAttributes(payload: AnonymousUserAttributes): void;

    getInitialNotification(
        success: (value: object) => void,
        error: (err: string) => void
    ): void;

    setOnRetenoPushReceivedListener(
        success: (value: object) => void,
        error: (err: string) => void
    ): void;

    performRemoteToken(
        apiKey: string,
        success?: () => void,
        error?: (err: string) => void
    ): void;

    setDeviceToken(deviceToken: string): void;

    registerApplicationDidBecomeActiveListener(fn: () => void): void;
    registerApplicationDidEnterBackgroundListener(fn: () => void): void;
}

declare global {
    const RetenoPlugin: RetenoPlugin;
}
