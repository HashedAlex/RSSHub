import type { Handler } from 'hono';

const handler: Handler = (ctx) => {
    ctx.header('Cache-Control', 'no-cache');

    return ctx.text(
        [
            'rsshub-twitter-lite',
            '',
            'Available routes:',
            '/twitter/user/:id',
            '/twitter/media/:id',
            '/twitter/tweet/:id/status/:status',
            '/twitter/keyword/:keyword',
            '',
            'Configure TWITTER_AUTH_TOKEN or TWITTER_THIRD_PARTY_API before using it.',
        ].join('\n')
    );
};

export default handler;
