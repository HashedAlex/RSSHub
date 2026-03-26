import { cookie as httpCookie, CookieAgent } from 'http-cookie-agent/undici';
import queryString from 'query-string';
import { Cookie, CookieJar } from 'tough-cookie';
import { Client, ProxyAgent } from 'undici';

import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import cache from '@/utils/cache';
import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import proxy from '@/utils/proxy';

import { baseUrl, bearerToken, gqlFeatures, gqlMap, thirdPartySupportedAPI, updateGqlMap } from './constants';
import { fetchDynamicQueryIds } from './query-ids';

let authTokenIndex = 0;

const token2Cookie = async (token?: string) => {
    const cacheKey = `twitter:cookie:${token || 'guest'}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const jar = new CookieJar();

    if (token) {
        await jar.setCookie(`auth_token=${token}`, 'https://x.com');
    }

    const agent = proxy.proxyUri
        ? new ProxyAgent({
              factory: (origin, opts) => new Client(origin as string, opts).compose(httpCookie({ jar })),
              uri: proxy.proxyUri,
          })
        : new CookieAgent({ cookies: { jar } });

    const bootstrapUrl = token ? 'https://x.com' : 'https://x.com/narendramodi?mx=2';
    const data = await ofetch(bootstrapUrl, {
        dispatcher: agent,
    });

    if (!token) {
        const gt = typeof data === 'string' ? data.match(/document\.cookie="gt=(\d+)/)?.[1] : undefined;
        if (gt) {
            jar.setCookieSync(`gt=${gt}`, 'https://x.com');
        }
    }

    const cookie = JSON.stringify(jar.serializeSync());
    await cache.set(cacheKey, cookie, config.cache.contentExpire);
    return cookie;
};

const getAuthToken = () => {
    if (!config.twitter.authToken?.length) {
        return undefined;
    }

    const index = authTokenIndex++ % config.twitter.authToken.length;
    return config.twitter.authToken[index];
};

export const twitterGot = async (
    url: string,
    params: Record<string, any>,
    options?: {
        allowNoAuth?: boolean;
    }
) => {
    const token = getAuthToken();

    if (!token && !options?.allowNoAuth) {
        throw new ConfigNotFoundError('No valid TWITTER_AUTH_TOKEN found');
    }

    const requestUrl = `${url}?${queryString.stringify(params)}`;
    const serializedCookie = await token2Cookie(token);
    const jar = CookieJar.deserializeSync(JSON.parse(serializedCookie));
    const agent = proxy.proxyUri
        ? new ProxyAgent({
              factory: (origin, opts) => new Client(origin as string, opts).compose(httpCookie({ jar })),
              uri: proxy.proxyUri,
          })
        : new CookieAgent({ cookies: { jar } });

    const jsonCookie = Object.fromEntries(
        jar
            .getCookieStringSync(url)
            .split(';')
            .map((item) => Cookie.parse(item.trim())?.toJSON())
            .filter(Boolean)
            .map((item) => [item?.key, item?.value])
    );

    let response;
    try {
        response = await ofetch.raw(requestUrl, {
            retry: 0,
            dispatcher: agent,
            headers: {
                authority: 'x.com',
                accept: '*/*',
                'accept-language': 'en-US,en;q=0.9',
                authorization: bearerToken,
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                dnt: '1',
                pragma: 'no-cache',
                referer: 'https://x.com/',
                'x-twitter-active-user': 'yes',
                'x-twitter-client-language': 'en',
                'x-csrf-token': jsonCookie.ct0,
                ...(token
                    ? {
                          'x-twitter-auth-type': 'OAuth2Session',
                      }
                    : {
                          'x-guest-token': jsonCookie.gt,
                      }),
            },
        });
    } catch (error: any) {
        const status = error?.response?.status;
        const responseText = error?.data || error?.response?._data || '';
        logger.error(`Twitter API error: status=${status}, url=${requestUrl.split('?')[0]}, response=${JSON.stringify(responseText).substring(0, 500)}`);
        logger.debug(`Cookie state: ct0=${jsonCookie.ct0 ? 'present' : 'missing'}, auth_token=${token ? 'present' : 'missing'}, gt=${jsonCookie.gt || 'missing'}`);

        if (status === 404) {
            throw new Error(
                `X web endpoint returned 404. Query ID may be outdated or IP may be blocked. URL: ${requestUrl.split('?')[0]}`
            );
        }

        throw error;
    }

    if (response.status >= 400) {
        logger.warn(`Twitter request failed: ${response.status} ${requestUrl}`);
    }

    await cache.set(`twitter:cookie:${token || 'guest'}`, JSON.stringify(jar.serializeSync()), config.cache.contentExpire);
    return response._data;
};

let dynamicIdsInitialized = false;

const initDynamicQueryIds = async () => {
    if (dynamicIdsInitialized) {
        return;
    }
    dynamicIdsInitialized = true;

    try {
        const ids = await fetchDynamicQueryIds();
        if (Object.keys(ids).length > 0) {
            updateGqlMap(ids);
            logger.info(`Dynamic query IDs loaded: ${JSON.stringify(ids)}`);
        } else {
            logger.warn('No dynamic query IDs found, using fallback static IDs');
        }
    } catch (error: any) {
        logger.warn(`Failed to load dynamic query IDs: ${error.message}`);
    }
};

const fetchData = async (endpoint: string, params: Record<string, any>) => {
    // Try to load dynamic query IDs on first call
    await initDynamicQueryIds();

    if (config.twitter.thirdPartyApi && thirdPartySupportedAPI.includes(endpoint)) {
        const { data } = await ofetch(`${config.twitter.thirdPartyApi}${gqlMap[endpoint as keyof typeof gqlMap]}`, {
            method: 'GET',
            params,
            headers: {
                'accept-encoding': 'gzip',
            },
        });

        return data;
    }

    const { data } = await twitterGot(`${baseUrl}${gqlMap[endpoint as keyof typeof gqlMap]}`, params);
    return data;
};

export const paginationTweets = async (endpoint: string, variables: Record<string, any>, path?: string[]) => {
    const params = {
        variables: JSON.stringify(variables),
        features: JSON.stringify(gqlFeatures[endpoint as keyof typeof gqlFeatures]),
    };
    const data = await fetchData(endpoint, params);

    let instructions = data;

    if (path) {
        for (const segment of path) {
            instructions = instructions?.[segment];
        }
        instructions = instructions?.instructions;
    } else {
        const userResult = data?.user?.result;
        const timeline = userResult?.timeline?.timeline || userResult?.timeline?.timeline_v2 || userResult?.timeline_v2?.timeline;
        instructions = timeline?.instructions;
    }

    if (!instructions) {
        logger.debug(`Twitter instructions not found for ${endpoint}`);
        return [];
    }

    const moduleItems = instructions.find((item) => item.type === 'TimelineAddToModule')?.moduleItems;
    const entries = instructions.find((item) => item.type === 'TimelineAddEntries')?.entries;
    const gridEntries = entries?.find((item) => item.entryId === 'profile-grid-0')?.content?.items;

    return gridEntries || moduleItems || entries || [];
};

export const gatherLegacyFromData = (entries: any[], filterNested?: string[], userId?: number | string) => {
    const tweets: any[] = [];
    const filteredEntries: any[] = [];

    for (const entry of entries) {
        const entryId = entry.entryId;

        if (!entryId) {
            continue;
        }

        if (entryId.startsWith('tweet-') || entryId.startsWith('profile-grid-0-tweet-')) {
            filteredEntries.push(entry);
        }

        if (filterNested && filterNested.some((prefix) => entryId.startsWith(prefix))) {
            filteredEntries.push(...(entry.content?.items || []));
        }
    }

    for (const entry of filteredEntries) {
        const content = entry.content || entry.item;
        let tweet = content?.content?.tweetResult?.result || content?.itemContent?.tweet_results?.result;

        if (tweet?.tweet) {
            tweet = tweet.tweet;
        }

        if (!tweet) {
            continue;
        }

        const retweet = tweet.legacy?.retweeted_status_result?.result;

        for (const currentTweet of [tweet, retweet]) {
            if (!currentTweet?.legacy) {
                continue;
            }

            currentTweet.legacy.user = currentTweet.core?.user_result?.result?.legacy || currentTweet.core?.user_results?.result?.legacy;

            if (currentTweet.legacy.user && currentTweet.core?.user_results?.result?.core) {
                const coreUser = currentTweet.core.user_results.result.core;
                if (coreUser.name) {
                    currentTweet.legacy.user.name = coreUser.name;
                }
                if (coreUser.screen_name) {
                    currentTweet.legacy.user.screen_name = coreUser.screen_name;
                }
            }

            currentTweet.legacy.id_str = currentTweet.rest_id;

            const quote = currentTweet.quoted_status_result?.result?.tweet || currentTweet.quoted_status_result?.result;
            if (quote) {
                currentTweet.legacy.quoted_status = quote.legacy;
                currentTweet.legacy.quoted_status.user = quote.core?.user_result?.result?.legacy || quote.core?.user_results?.result?.legacy;
                if (currentTweet.legacy.quoted_status.user && quote.core?.user_results?.result?.core) {
                    const quoteCoreUser = quote.core.user_results.result.core;
                    if (quoteCoreUser.name) {
                        currentTweet.legacy.quoted_status.user.name = quoteCoreUser.name;
                    }
                    if (quoteCoreUser.screen_name) {
                        currentTweet.legacy.quoted_status.user.screen_name = quoteCoreUser.screen_name;
                    }
                }
            }

            if (currentTweet.note_tweet) {
                const note = currentTweet.note_tweet.note_tweet_results.result;
                currentTweet.legacy.entities.hashtags = note.entity_set.hashtags;
                currentTweet.legacy.entities.symbols = note.entity_set.symbols;
                currentTweet.legacy.entities.urls = note.entity_set.urls;
                currentTweet.legacy.entities.user_mentions = note.entity_set.user_mentions;
                currentTweet.legacy.full_text = note.text;
            }
        }

        const legacy = tweet.legacy;
        if (!legacy) {
            continue;
        }

        if (retweet) {
            legacy.retweeted_status = retweet.legacy;
        }

        if (userId === undefined || legacy.user_id_str === `${userId}`) {
            tweets.push(legacy);
        }
    }

    return tweets;
};
