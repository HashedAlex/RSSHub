import type { ErrorHandler, NotFoundHandler } from 'hono';

import ConfigNotFoundError from '@/errors/types/config-not-found';
import InvalidParameterError from '@/errors/types/invalid-parameter';
import NotFoundError from '@/errors/types/not-found';
import logger from '@/utils/logger';

const notFoundHandler: NotFoundHandler = (ctx) => ctx.text('Not found', 404);

const errorHandler: ErrorHandler = (error, ctx) => {
    logger.error(error instanceof Error ? error.stack || error.message : String(error));

    if (error instanceof InvalidParameterError) {
        return ctx.text(error.message || 'Invalid parameter', 400);
    }

    if (error instanceof NotFoundError) {
        return ctx.text(error.message || 'Not found', 404);
    }

    if (error instanceof ConfigNotFoundError) {
        return ctx.text(error.message || 'Missing configuration', 500);
    }

    return ctx.text(error instanceof Error ? error.message : 'Internal server error', 500);
};

export { errorHandler, notFoundHandler };
