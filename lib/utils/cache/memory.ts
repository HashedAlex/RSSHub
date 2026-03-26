import { LRUCache } from 'lru-cache';

import { config } from '@/config';

const clients: {
    memoryCache?: LRUCache<string, string>;
} = {};

const status = {
    available: false,
};

export default {
    init: () => {
        if (clients.memoryCache) {
            return;
        }

        clients.memoryCache = new LRUCache<string, string>({
            ttl: config.cache.routeExpire * 1000,
            max: 500,
        });
        status.available = true;
    },
    get: async (key: string, refresh = true) => {
        if (!clients.memoryCache) {
            return null;
        }

        return clients.memoryCache.get(key, { updateAgeOnGet: refresh }) ?? null;
    },
    set: async (key: string, value?: string | Record<string, any>, maxAge = config.cache.contentExpire) => {
        if (!clients.memoryCache || !key) {
            return;
        }

        let serialized = value;
        if (!serialized || serialized === 'undefined') {
            serialized = '';
        }
        if (typeof serialized === 'object') {
            serialized = JSON.stringify(serialized);
        }

        clients.memoryCache.set(key, serialized, { ttl: maxAge * 1000 });
    },
    has: async (key: string) => clients.memoryCache?.has(key) ?? false,
    clients,
    status,
};
