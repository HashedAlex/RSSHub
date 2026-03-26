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

const extractQueryIds = (jsContent: string): Record<string, string> => {
    const result: Record<string, string> = {};

    for (const endpoint of ENDPOINTS_NEEDED) {
        // Pattern 1: queryId:"xxx",operationName:"EndpointName"
        const p1 = new RegExp(`queryId:"([^"]+)",operationName:"${endpoint}"`);
        const m1 = p1.exec(jsContent);
        if (m1) { result[endpoint] = `/graphql/${m1[1]}/${endpoint}`; continue; }

        // Pattern 2: operationName:"EndpointName"...queryId:"xxx"
        const p2 = new RegExp(`operationName:"${endpoint}"[^}]{0,50}queryId:"([^"]+)"`);
        const m2 = p2.exec(jsContent);
        if (m2) { result[endpoint] = `/graphql/${m2[1]}/${endpoint}`; continue; }

        // Pattern 3: queryId:"xxx" with gap to operationName:"EndpointName"
        const p3 = new RegExp(`queryId:"([^"]+)"[^}]{0,100}operationName:"${endpoint}"`);
        const m3 = p3.exec(jsContent);
        if (m3) { result[endpoint] = `/graphql/${m3[1]}/${endpoint}`; continue; }

        // Pattern 4: URL path pattern
        const p4 = new RegExp(`/graphql/([A-Za-z0-9_-]+)/${endpoint}[^A-Za-z]`);
        const m4 = p4.exec(jsContent);
        if (m4) { result[endpoint] = `/graphql/${m4[1]}/${endpoint}`; continue; }
    }

    return result;
};

const fetchJs = async (url: string): Promise<string> => {
    const js = await ofetch(url, {
        dispatcher: makeAgent(),
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        },
    });
    return typeof js === 'string' ? js : '';
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
            logger.info('Fetching X.com to extract JS bundle URLs...');

            const html = await ofetch('https://x.com', {
                dispatcher: makeAgent(),
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

            // Step 1: Find the main.js bundle URL from HTML
            const mainMatch = html.match(/src=["'](https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main\.[^"']+\.js)["']/);
            if (!mainMatch) {
                logger.warn('Could not find main.js bundle URL');
                // Log all script srcs for debugging
                const allScripts = [...html.matchAll(/src=["']([^"']+\.js)["']/g)].map(m => m[1]);
                logger.warn(`Script URLs found: ${allScripts.join(', ')}`);
                return {};
            }

            const mainUrl = mainMatch[1];
            const baseJsUrl = mainUrl.substring(0, mainUrl.lastIndexOf('/') + 1);
            logger.info(`Main bundle: ${mainUrl}`);
            logger.info(`Base JS URL: ${baseJsUrl}`);

            // Step 2: Fetch main.js and find chunk references
            const mainJs = await fetchJs(mainUrl);

            // Search main.js for any queryId/operationName patterns first
            let allIds = extractQueryIds(mainJs);
            if (Object.keys(allIds).length >= ENDPOINTS_NEEDED.length) {
                dynamicGqlMap = allIds;
                return allIds;
            }

            // Step 3: Extract chunk filenames from main.js
            // Webpack chunks typically referenced as: "chunkName":"hashvalue" or similar
            // Look for patterns like: "api":"abc123" or loader patterns with .js files
            const chunkHashes: string[] = [];

            // Pattern: string literals that look like chunk filenames (hash.js pattern)
            const chunkPattern = /["']([a-zA-Z0-9._-]+)["']\s*\+\s*["']\.["']\s*\+\s*["']([a-f0-9]+)["']/g;
            let chunkMatch;
            while ((chunkMatch = chunkPattern.exec(mainJs)) !== null) {
                chunkHashes.push(`${chunkMatch[1]}.${chunkMatch[2]}`);
            }

            // Also look for direct chunk references: "abc123def.js"
            const directChunkPattern = /["']([a-zA-Z][a-zA-Z0-9_-]*\.[a-f0-9]{6,12})["']/g;
            while ((chunkMatch = directChunkPattern.exec(mainJs)) !== null) {
                if (!chunkHashes.includes(chunkMatch[1])) {
                    chunkHashes.push(chunkMatch[1]);
                }
            }

            // Look for chunk map pattern: {123:"hashvalue", 456:"hashvalue"}
            // or: e=>{...e.p+"chunk.hashvalue.js"...}
            const hashMapPattern = /:\s*["']([a-f0-9]{8,12})["']/g;
            const hashValues: string[] = [];
            while ((chunkMatch = hashMapPattern.exec(mainJs)) !== null) {
                hashValues.push(chunkMatch[1]);
            }

            logger.info(`Found ${chunkHashes.length} chunk refs, ${hashValues.length} hash values in main.js`);

            // Debug: log a sample around "queryId" if it exists in main.js
            if (mainJs.includes('queryId')) {
                const idx = mainJs.indexOf('queryId');
                logger.info(`main.js contains "queryId" at ${idx}: ...${mainJs.substring(Math.max(0, idx - 50), idx + 100)}...`);
            }

            // Debug: search for endpoint names in main.js
            for (const ep of ENDPOINTS_NEEDED) {
                if (mainJs.includes(ep)) {
                    const idx = mainJs.indexOf(ep);
                    logger.info(`main.js contains "${ep}": ...${mainJs.substring(Math.max(0, idx - 80), idx + ep.length + 30)}...`);
                }
            }

            // Step 4: Try to find API-related chunks
            // Look for chunk loading patterns with specific names
            const apiChunkPattern = /["'](api[^"']*|endpoints[^"']*|graphql[^"']*|operations[^"']*)["']\s*[:\]]/gi;
            const apiChunks: string[] = [];
            while ((chunkMatch = apiChunkPattern.exec(mainJs)) !== null) {
                apiChunks.push(chunkMatch[1]);
            }
            if (apiChunks.length > 0) {
                logger.info(`Potential API chunk names: ${apiChunks.join(', ')}`);
            }

            // Step 5: Try loading chunk files that might contain API definitions
            // Build candidate URLs from chunk hashes
            const candidateUrls: string[] = [];
            for (const hash of chunkHashes.slice(0, 20)) {
                candidateUrls.push(`${baseJsUrl}${hash}.js`);
            }

            // Also try common chunk naming patterns
            for (const name of apiChunks) {
                for (const hash of hashValues.slice(0, 5)) {
                    candidateUrls.push(`${baseJsUrl}${name}.${hash}.js`);
                }
            }

            logger.info(`Trying ${candidateUrls.length} candidate chunk URLs...`);

            // Fetch candidate chunks and look for query IDs
            const chunkResults = await Promise.allSettled(
                candidateUrls.map(async (url) => {
                    try {
                        const js = await fetchJs(url);
                        if (js) {
                            const ids = extractQueryIds(js);
                            if (Object.keys(ids).length > 0) {
                                logger.info(`Found query IDs in ${url.split('/').pop()}: ${JSON.stringify(ids)}`);
                            }
                            return ids;
                        }
                        return {};
                    } catch {
                        return {};
                    }
                })
            );

            for (const result of chunkResults) {
                if (result.status === 'fulfilled') {
                    Object.assign(allIds, result.value);
                }
            }

            const found = Object.keys(allIds);
            const missing = ENDPOINTS_NEEDED.filter((e) => !allIds[e]);

            if (found.length > 0) {
                logger.info(`Extracted query IDs: ${JSON.stringify(allIds)}`);
                dynamicGqlMap = allIds;
            }
            if (missing.length > 0) {
                logger.warn(`Missing query IDs for: ${missing.join(', ')}`);
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
