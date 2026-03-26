import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import proxy from '@/utils/proxy';
import { CookieAgent } from 'http-cookie-agent/undici';
import { cookie as httpCookie } from 'http-cookie-agent/undici';
import { CookieJar } from 'tough-cookie';
import { Client, ProxyAgent } from 'undici';

const ENDPOINTS_NEEDED = ['UserTweets', 'UserByScreenName', 'UserTweetsAndReplies', 'UserMedia', 'UserByRestId', 'SearchTimeline', 'TweetDetail'];

// Cache for dynamic query IDs
let dynamicGqlMap: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

const makeAgent = () => {
    const jar = new CookieJar();
    return proxy.proxyUri
        ? new ProxyAgent({
              factory: (origin, opts) => new Client(origin as string, opts).compose(httpCookie({ jar })),
              uri: proxy.proxyUri,
          })
        : new CookieAgent({ cookies: { jar } });
};

const extractJsBundleUrls = (html: string): string[] => {
    const urls: string[] = [];
    // Match script src attributes pointing to JS files on abs.twimg.com
    const scriptRegex = /src=["'](https:\/\/abs\.twimg\.com\/responsive-web\/client-web[^"']*\.js)["']/g;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        urls.push(match[1]);
    }

    // Also try generic script tags with .js
    const genericRegex = /src=["'](https:\/\/[^"']*(?:main|client|api|endpoints)[^"']*\.js)["']/g;
    while ((match = genericRegex.exec(html)) !== null) {
        if (!urls.includes(match[1])) {
            urls.push(match[1]);
        }
    }

    return urls;
};

const extractQueryIds = (jsContent: string): Record<string, string> => {
    const result: Record<string, string> = {};

    for (const endpoint of ENDPOINTS_NEEDED) {
        // Pattern 1: queryId:"xxx",operationName:"EndpointName"
        const pattern1 = new RegExp(`queryId:"([^"]+)",operationName:"${endpoint}"`, 'g');
        const match1 = pattern1.exec(jsContent);
        if (match1) {
            result[endpoint] = `/graphql/${match1[1]}/${endpoint}`;
            continue;
        }

        // Pattern 2: {queryId:"xxx",operationName:"EndpointName",operationType:"query"}
        const pattern2 = new RegExp(`\\{queryId:"([^"]+)",operationName:"${endpoint}"`, 'g');
        const match2 = pattern2.exec(jsContent);
        if (match2) {
            result[endpoint] = `/graphql/${match2[1]}/${endpoint}`;
            continue;
        }

        // Pattern 3: operationName:"EndpointName"...queryId:"xxx" (reversed order)
        const pattern3 = new RegExp(`operationName:"${endpoint}"[^}]*queryId:"([^"]+)"`, 'g');
        const match3 = pattern3.exec(jsContent);
        if (match3) {
            result[endpoint] = `/graphql/${match3[1]}/${endpoint}`;
            continue;
        }

        // Pattern 4: e.queryId="xxx"...e.operationName="EndpointName" or similar assignment patterns
        const pattern4 = new RegExp(`/graphql/([A-Za-z0-9_-]+)/${endpoint}`, 'g');
        const match4 = pattern4.exec(jsContent);
        if (match4) {
            result[endpoint] = `/graphql/${match4[1]}/${endpoint}`;
        }
    }

    return result;
};

export const fetchDynamicQueryIds = async (): Promise<Record<string, string>> => {
    if (dynamicGqlMap) {
        return dynamicGqlMap;
    }

    // Deduplicate concurrent fetches
    if (fetchPromise) {
        return fetchPromise;
    }

    fetchPromise = (async () => {
        try {
            const agent = makeAgent();
            logger.info('Fetching X.com to extract JS bundle URLs...');

            const html = await ofetch('https://x.com', {
                dispatcher: agent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
            });

            if (typeof html !== 'string') {
                logger.warn('X.com response is not a string');
                return {};
            }

            const bundleUrls = extractJsBundleUrls(html);
            logger.info(`Found ${bundleUrls.length} JS bundle URLs`);

            if (bundleUrls.length === 0) {
                // Log a snippet of the HTML for debugging
                logger.warn(`No JS bundles found. HTML snippet: ${html.substring(0, 500)}`);
                return {};
            }

            const allIds: Record<string, string> = {};

            // Fetch bundles in parallel (limit to first 10 to avoid too many requests)
            const bundlesToFetch = bundleUrls.slice(0, 10);
            const results = await Promise.allSettled(
                bundlesToFetch.map(async (url) => {
                    try {
                        const js = await ofetch(url, {
                            dispatcher: makeAgent(),
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                            },
                        });
                        if (typeof js === 'string') {
                            return extractQueryIds(js);
                        }
                        return {};
                    } catch {
                        return {};
                    }
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    Object.assign(allIds, result.value);
                }
            }

            const found = Object.keys(allIds);
            const missing = ENDPOINTS_NEEDED.filter((e) => !allIds[e]);

            logger.info(`Extracted query IDs: ${found.join(', ')}`);
            if (missing.length > 0) {
                logger.warn(`Missing query IDs for: ${missing.join(', ')}`);
            }

            if (found.length > 0) {
                dynamicGqlMap = allIds;
            }

            return allIds;
        } catch (error: any) {
            logger.error(`Failed to fetch dynamic query IDs: ${error.message}`);
            return {};
        } finally {
            fetchPromise = null;
        }
    })();

    return fetchPromise;
};

export const getDynamicGqlMap = () => dynamicGqlMap;
