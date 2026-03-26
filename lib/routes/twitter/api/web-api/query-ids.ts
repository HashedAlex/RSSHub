import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import proxy from '@/utils/proxy';
import { CookieAgent } from 'http-cookie-agent/undici';
import { cookie as httpCookie } from 'http-cookie-agent/undici';
import { CookieJar } from 'tough-cookie';
import { Client, ProxyAgent } from 'undici';

const ENDPOINTS_NEEDED = ['UserTweets', 'UserByScreenName', 'UserTweetsAndReplies', 'UserMedia', 'UserByRestId', 'SearchTimeline', 'TweetDetail'];

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
    // Match all script src attributes pointing to .js files
    const scriptRegex = /src=["'](https?:\/\/[^"']*\.js)["']/g;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        urls.push(match[1]);
    }
    return urls;
};

const extractQueryIds = (jsContent: string): Record<string, string> => {
    const result: Record<string, string> = {};

    for (const endpoint of ENDPOINTS_NEEDED) {
        // Pattern 1: queryId:"xxx",operationName:"EndpointName"
        const p1 = new RegExp(`queryId:"([^"]+)",operationName:"${endpoint}"`);
        const m1 = p1.exec(jsContent);
        if (m1) { result[endpoint] = `/graphql/${m1[1]}/${endpoint}`; continue; }

        // Pattern 2: operationName:"EndpointName",queryId:"xxx" (reversed)
        const p2 = new RegExp(`operationName:"${endpoint}"[^}]{0,50}queryId:"([^"]+)"`);
        const m2 = p2.exec(jsContent);
        if (m2) { result[endpoint] = `/graphql/${m2[1]}/${endpoint}`; continue; }

        // Pattern 3: queryId:"xxx",...operationName:"EndpointName" with gap
        const p3 = new RegExp(`queryId:"([^"]+)"[^}]{0,100}operationName:"${endpoint}"`);
        const m3 = p3.exec(jsContent);
        if (m3) { result[endpoint] = `/graphql/${m3[1]}/${endpoint}`; continue; }

        // Pattern 4: endpoint in URL path
        const p4 = new RegExp(`/graphql/([A-Za-z0-9_-]+)/${endpoint}[^A-Za-z]`);
        const m4 = p4.exec(jsContent);
        if (m4) { result[endpoint] = `/graphql/${m4[1]}/${endpoint}`; continue; }

        // Pattern 5: e="xxx"...operationName:"EndpointName" or similar minified patterns
        // In minified JS, it may look like: {queryId:"xxx",operationName:"EndpointName",operationType:"query"}
        // Or with single quotes or template format
        const p5 = new RegExp(`["']([A-Za-z0-9_-]{20,})["'][^}]{0,30}["']${endpoint}["']`);
        const m5 = p5.exec(jsContent);
        if (m5) { result[endpoint] = `/graphql/${m5[1]}/${endpoint}`; continue; }
    }

    return result;
};

export const fetchDynamicQueryIds = async (): Promise<Record<string, string>> => {
    if (dynamicGqlMap) {
        return dynamicGqlMap;
    }

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
            logger.info(`Found ${bundleUrls.length} JS bundle URLs: ${bundleUrls.slice(0, 5).join(', ')}`);

            if (bundleUrls.length === 0) {
                logger.warn(`No JS bundles found. HTML snippet: ${html.substring(0, 1000)}`);
                return {};
            }

            const allIds: Record<string, string> = {};

            // Fetch ALL bundles - query IDs could be in any of them
            const results = await Promise.allSettled(
                bundleUrls.map(async (url) => {
                    try {
                        const js = await ofetch(url, {
                            dispatcher: makeAgent(),
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                            },
                        });
                        if (typeof js === 'string') {
                            // Debug: search for any mention of our endpoint names
                            for (const ep of ENDPOINTS_NEEDED) {
                                if (js.includes(ep)) {
                                    // Find context around the endpoint name
                                    const idx = js.indexOf(ep);
                                    const snippet = js.substring(Math.max(0, idx - 80), idx + ep.length + 30);
                                    logger.info(`Found "${ep}" in ${url.split('/').pop()}: ...${snippet}...`);
                                }
                            }
                            return extractQueryIds(js);
                        }
                        return {};
                    } catch (e: any) {
                        logger.warn(`Failed to fetch bundle ${url}: ${e.message}`);
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

            if (found.length > 0) {
                logger.info(`Extracted query IDs: ${JSON.stringify(allIds)}`);
            }
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
