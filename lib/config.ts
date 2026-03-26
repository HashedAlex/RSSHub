const parseBoolean = (value: string | undefined, fallback = false) => {
    if (value === undefined) {
        return fallback;
    }

    return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value: string | undefined) =>
    value
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeUrl = (value: string | undefined) => value?.replace(/\/+$/, '');

export const config = {
    connect: {
        port: parseNumber(process.env.PORT, 1200),
    },
    listenInaddrAny: parseBoolean(process.env.LISTEN_INADDR_ANY, true),
    requestRetry: parseNumber(process.env.REQUEST_RETRY, 1),
    requestTimeout: parseNumber(process.env.REQUEST_TIMEOUT, 30000),
    cache: {
        routeExpire: parseNumber(process.env.CACHE_ROUTE_EXPIRE, 300),
        contentExpire: parseNumber(process.env.CACHE_CONTENT_EXPIRE, 3600),
    },
    titleLengthLimit: parseNumber(process.env.TITLE_LENGTH_LIMIT, 200),
    disallowRobot: parseBoolean(process.env.DISALLOW_ROBOT, false),
    proxyUri: normalizeUrl(process.env.PROXY_URI || process.env.HTTPS_PROXY || process.env.HTTP_PROXY),
    twitter: {
        authToken: parseList(process.env.TWITTER_AUTH_TOKEN),
        thirdPartyApi: normalizeUrl(process.env.TWITTER_THIRD_PARTY_API),
    },
} as const;

export type Config = typeof config;
