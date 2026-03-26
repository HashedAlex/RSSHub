import { createFetch } from 'ofetch';

import { config } from '@/config';
import logger from '@/utils/logger';

const ofetch = createFetch({
    fetch: globalThis.fetch,
}).create({
    retry: config.requestRetry,
    timeout: config.requestTimeout,
    retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
    onRequestError({ request, error }) {
        logger.error(`Request failed: ${request} ${error}`);
    },
    onResponseError({ request, response }) {
        logger.warn(`Request failed: ${request} ${response.status}`);
    },
});

export default ofetch;
