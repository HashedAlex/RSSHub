import { config } from '@/config';

import memory from './memory';

memory.init();

export default {
    ...memory,
    tryGet: async <T extends string | Record<string, any> | any[]>(key: string, getValueFunc: () => Promise<T>, maxAge = config.cache.contentExpire, refresh = true) => {
        if (typeof key !== 'string') {
            throw new TypeError('Cache key must be a string');
        }

        let value = await memory.get(key, refresh);
        if (value) {
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        }

        const nextValue = await getValueFunc();
        await memory.set(key, nextValue, maxAge);
        return nextValue;
    },
};
