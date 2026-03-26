import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { jsxRenderer } from 'hono/jsx-renderer';
import { trimTrailingSlash } from 'hono/trailing-slash';

import { errorHandler, notFoundHandler } from '@/errors';
import registry from '@/registry';

const app = new Hono();

app.use(trimTrailingSlash());
app.use(compress());
app.use(
    jsxRenderer(({ children }) => <>{children}</>, {
        docType: '<?xml version="1.0" encoding="UTF-8"?>',
        stream: {},
    })
);

app.route('/', registry);

app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
