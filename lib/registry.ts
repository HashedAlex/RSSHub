import { Hono } from 'hono';

import { renderFeed } from '@/render-feed';
import healthz from '@/routes/healthz';
import index from '@/routes/index';
import robotstxt from '@/routes/robots.txt';
import { route as keywordRoute } from '@/routes/twitter/keyword';
import { route as mediaRoute } from '@/routes/twitter/media';
import { route as tweetRoute } from '@/routes/twitter/tweet';
import { route as userRoute } from '@/routes/twitter/user';
import logger from '@/utils/logger';

const app = new Hono();
const twitterApp = app.basePath('/twitter');

for (const route of [userRoute, mediaRoute, tweetRoute, keywordRoute]) {
    twitterApp.get(route.path, async (ctx) => {
        logger.debug(`Matched route: /twitter${route.path}`);
        const result = await route.handler(ctx);

        if (result instanceof Response) {
            return result;
        }

        return renderFeed(ctx, result);
    });
}

app.get('/', index);
app.get('/healthz', healthz);
app.get('/robots.txt', robotstxt);

export default app;
