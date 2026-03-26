import type { Context } from 'hono';

import { config } from '@/config';
import type { Data } from '@/types';
import { collapseWhitespace, convertDateToISO8601 } from '@/utils/common-utils';
import json from '@/views/json';
import RSS from '@/views/rss';

const normalizeDate = (date?: string | number | Date) => {
    if (!date) {
        return undefined;
    }

    try {
        return new Date(date).toUTCString();
    } catch {
        return undefined;
    }
};

export const renderFeed = (ctx: Context, data: Data) => {
    const outputType = ctx.req.query('format') || 'rss';
    const ttl = Math.max(Math.trunc(config.cache.routeExpire / 60), 1);

    data.title = collapseWhitespace(data.title) || '';
    data.description = collapseWhitespace(data.description);

    if (data.item) {
        for (const item of data.item) {
            item.title = collapseWhitespace(item.title) || '';
            item.description = item.description?.replaceAll(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F\u200B\uFFFF]/g, '');

            if (typeof item.author === 'object' && item.author !== null) {
                for (const author of item.author) {
                    author.name = collapseWhitespace(author.name) || '';
                }
            }

            if (item.title.length > config.titleLengthLimit) {
                item.title = `${item.title.slice(0, config.titleLengthLimit)}...`;
            }
        }
    }

    const result: Data = {
        ...data,
        lastBuildDate: new Date().toUTCString(),
        atomlink: ctx.req.url,
        ttl,
    };

    if (outputType === 'json') {
        if (result.item) {
            for (const item of result.item) {
                item.pubDate = convertDateToISO8601(item.pubDate) || '';
                item.updated = convertDateToISO8601(item.updated) || '';
            }
        }
        ctx.header('Content-Type', 'application/feed+json; charset=UTF-8');
        return ctx.body(json(result));
    }

    if (result.item) {
        for (const item of result.item) {
            item.pubDate = normalizeDate(item.pubDate);
            item.updated = normalizeDate(item.updated);
        }
    }

    return ctx.render(<RSS data={result} />);
};
