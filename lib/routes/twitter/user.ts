import type { Route } from '@/types';

import api from './api';
import utils from './utils';

export const route: Route = {
    path: '/user/:id/:routeParams?',
    example: '/twitter/user/_RSSHub',
    name: 'User timeline',
    handler,
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const { count, include_replies, include_rts } = utils.parseRouteParams(ctx.req.param('routeParams'));
    const params = count ? { count } : {};

    await api.init();
    const userInfo = await api.getUser(id);
    let data = await (include_replies ? api.getUserTweetsAndReplies(id, params) : api.getUserTweets(id, params));

    if (!include_rts) {
        data = utils.excludeRetweet(data);
    }

    const profileImageUrl = userInfo?.profile_image_url || userInfo?.profile_image_url_https || '';

    return {
        title: `Twitter @${userInfo?.name || id}`,
        link: `https://x.com/${userInfo?.screen_name || id}`,
        image: profileImageUrl.replace(/_normal\.(jpg|png)$/, '.$1'),
        description: userInfo?.description,
        item: utils.ProcessFeed(ctx, { data }),
        allowEmpty: true,
    };
}
