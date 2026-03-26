import type { Route } from '@/types';

import api from './api';
import utils from './utils';

export const route: Route = {
    path: '/keyword/:keyword/:routeParams?',
    example: '/twitter/keyword/RSSHub',
    name: 'Keyword search',
    handler,
};

async function handler(ctx) {
    const keyword = ctx.req.param('keyword');

    await api.init();
    const data = await api.getSearch(keyword);

    return {
        title: `Twitter keyword - ${keyword}`,
        link: `https://x.com/search?q=${encodeURIComponent(keyword)}`,
        item: utils.ProcessFeed(ctx, { data }),
        allowEmpty: true,
    };
}
