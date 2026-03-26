import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';

import webApi from './web-api/api';

const init = () => {
    if (!config.twitter.thirdPartyApi && !config.twitter.authToken?.length) {
        throw new ConfigNotFoundError('Set TWITTER_AUTH_TOKEN or TWITTER_THIRD_PARTY_API before using Twitter routes');
    }
};

export default {
    ...webApi,
    init,
};
