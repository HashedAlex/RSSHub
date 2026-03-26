import { ProxyAgent } from 'undici';

import { config } from '@/config';

const proxyUri = config.proxyUri;

export default {
    proxyUri,
    dispatcher: proxyUri ? new ProxyAgent(proxyUri) : null,
};
