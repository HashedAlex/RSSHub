import type { Route } from '@/types';

import api from './api';
import utils from './utils';

export const route: Route = {
    path: '/tweet/:id/status/:status/:routeParams?',
    example: '/twitter/tweet/DIYgod/status/1650844643997646852',
    name: 'Tweet detail',
    handler,
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const status = ctx.req.param('status');
    const params = {
        focalTweetId: status,
        with_rux_injections: false,
        includePromotedContent: false,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withV2Timeline: true,
    };

    await api.init();
    const userInfo = await api.getUser(id);
    const data = await api.getUserTweet(id, params);
    const profileImageUrl = userInfo?.profile_image_url || userInfo?.profile_image_url_https || '';

    return {
        title: `Twitter @${userInfo?.name || id}`,
        link: `https://x.com/${userInfo?.screen_name || id}/status/${status}`,
        image: profileImageUrl.replace(/_normal\.(jpg|png)$/, '.$1'),
        description: userInfo?.description,
        item: utils.ProcessFeed(ctx, { data }),
        allowEmpty: true,
    };
}
