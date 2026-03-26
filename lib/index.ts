import { serve } from '@hono/node-server';

import app from '@/app';
import { config } from '@/config';
import { getLocalhostAddress } from '@/utils/common-utils';
import logger from '@/utils/logger';

const port = config.connect.port;
const hostname = config.listenInaddrAny ? '0.0.0.0' : '127.0.0.1';

serve({
    fetch: app.fetch,
    hostname,
    port,
    serverOptions: {
        maxHeaderSize: 1024 * 32,
    },
});

logger.info(`Twitter RSS is running on port ${port}`);
logger.info(`Local: http://localhost:${port}`);

if (config.listenInaddrAny) {
    for (const ip of getLocalhostAddress()) {
        logger.info(`Network: http://${ip}:${port}`);
    }
}
