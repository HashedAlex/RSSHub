import type { Route } from '@/types';

import api from './api';
import utils from './utils';

export const route: Route = {
    path: '/media/:id/:routeParams?',
    example: '/twitter/media/_RSSHub',
    name: 'User media',
    handler,
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const { count } = utils.parseRouteParams(ctx.req.param('routeParams'));
    const params = count ? { count } : {};

    await api.init();
    const userInfo = await api.getUser(id);
    const data = await api.getUserMedia(id, params);
    const profileImageUrl = userInfo?.profile_image_url || userInfo?.profile_image_url_https || '';

    return {
        title: `Twitter media @${userInfo?.name || id}`,
        link: `https://x.com/${userInfo?.screen_name || id}/media`,
        image: profileImageUrl.replace(/_normal\.(jpg|png)$/, '.$1'),
        description: userInfo?.description,
        item: utils.ProcessFeed(ctx, { data }),
        allowEmpty: true,
    };
}
