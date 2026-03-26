import InvalidParameterError from '@/errors/types/invalid-parameter';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { config } from '@/config';

import { baseUrl, gqlFeatures, gqlMap } from './constants';
import { ensureDynamicIds, gatherLegacyFromData, paginationTweets, twitterGot } from './utils';

const getUserData = (id: string) =>
    cache.tryGet(`twitter-userdata:${id}`, async () => {
        // Ensure dynamic query IDs are loaded before using gqlMap
        await ensureDynamicIds();

        const params = {
            variables: id.startsWith('+')
                ? JSON.stringify({
                      userId: id.slice(1),
                      withSafetyModeUserFields: true,
                  })
                : JSON.stringify({
                      screen_name: id,
                      withGrokTranslatedBio: false,
                  }),
            features: JSON.stringify(id.startsWith('+') ? gqlFeatures.UserByRestId : gqlFeatures.UserByScreenName),
            fieldToggles: JSON.stringify({
                withPayments: false,
                withAuxiliaryUserLabels: true,
            }),
        };

        if (config.twitter.thirdPartyApi) {
            const endpoint = id.startsWith('+') ? gqlMap.UserByRestId : gqlMap.UserByScreenName;
            return ofetch(`${config.twitter.thirdPartyApi}${endpoint}`, {
                method: 'GET',
                params,
                headers: {
                    'accept-encoding': 'gzip',
                },
            });
        }

        return twitterGot(`${baseUrl}${id.startsWith('+') ? gqlMap.UserByRestId : gqlMap.UserByScreenName}`, params, {
            allowNoAuth: !id.startsWith('+'),
        });
    });

const cacheTryGet = async (_id: string, params: Record<string, any> | undefined, func: (id: string, params?: Record<string, any>) => Promise<any>) => {
    const userData: any = await getUserData(_id);
    const id = (userData.data?.user || userData.data?.user_result)?.result?.rest_id;

    if (id === undefined) {
        throw new InvalidParameterError('User not found');
    }

    return cache.tryGet(`twitter:${id}:${func.name}:${JSON.stringify(params ?? {})}`, () => func(id, params), config.cache.routeExpire, false);
};

const getUserTweets = (id: string, params?: Record<string, any>) =>
    cacheTryGet(id, params, async (userId, requestParams = {}) =>
        gatherLegacyFromData(
            await paginationTweets('UserTweets', {
                ...requestParams,
                userId,
                count: 20,
                includePromotedContent: true,
                withQuickPromoteEligibilityTweetFields: true,
                withVoice: true,
                withV2Timeline: true,
            })
        )
    );

const getUserTweetsAndReplies = (id: string, params?: Record<string, any>) =>
    cacheTryGet(id, params, async (userId, requestParams = {}) =>
        gatherLegacyFromData(
            await paginationTweets('UserTweetsAndReplies', {
                ...requestParams,
                userId,
                count: 20,
                includePromotedContent: true,
                withCommunity: true,
                withVoice: true,
                withV2Timeline: true,
            }),
            ['profile-conversation-'],
            userId
        )
    );

const getUserMedia = (id: string, params?: Record<string, any>) =>
    cacheTryGet(id, params, async (userId, requestParams = {}) =>
        gatherLegacyFromData(
            await paginationTweets('UserMedia', {
                ...requestParams,
                userId,
                count: 20,
                includePromotedContent: false,
                withClientEventToken: false,
                withBirdwatchNotes: false,
                withVoice: true,
                withV2Timeline: true,
            })
        )
    );

const getUserTweet = (id: string, params?: Record<string, any>) =>
    cacheTryGet(id, params, async (userId, requestParams = {}) =>
        gatherLegacyFromData(
            await paginationTweets('TweetDetail', {
                ...requestParams,
                userId,
                includeHasBirdwatchNotes: false,
                includePromotedContent: false,
                withBirdwatchNotes: false,
                withVoice: false,
                withV2Timeline: true,
            }, ['threaded_conversation_with_injections_v2']),
            ['homeConversation-', 'conversationthread-']
        )
    );

const getSearch = async (keywords: string, params?: Record<string, any>) =>
    gatherLegacyFromData(
        await paginationTweets('SearchTimeline', {
            ...params,
            rawQuery: keywords,
            count: 20,
            querySource: 'typed_query',
            product: 'Latest',
        }, ['search_by_raw_query', 'search_timeline', 'timeline'])
    );

const getUser = async (id: string) => {
    const userData: any = await getUserData(id);

    return {
        profile_image_url: userData.data?.user?.result?.avatar?.image_url,
        ...userData.data?.user?.result?.core,
        ...(userData.data?.user || userData.data?.user_result)?.result?.legacy,
    };
};

export default {
    getUser,
    getUserTweets,
    getUserTweetsAndReplies,
    getUserMedia,
    getUserTweet,
    getSearch,
};
