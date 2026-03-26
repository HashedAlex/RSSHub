const baseUrl = 'https://x.com/i/api';

// Fallback static query IDs (may be outdated)
const fallbackEndpoints = [
    '/graphql/HeWHY26ItCfUmm1e6ITjeA/UserTweets',
    '/graphql/1VOOyvKkiI3FMmkeDNxM9A/UserByScreenName',
    '/graphql/OAx9yEcW3JA9bPo63pcYlA/UserTweetsAndReplies',
    '/graphql/vFPc2LVIu7so2uA_gHQAdg/UserMedia',
    '/graphql/WJ7rCtezBVT6nk6VM5R8Bw/UserByRestId',
    '/graphql/AIdc203rPpK_k_2KWSdm7g/SearchTimeline',
    '/graphql/_8aYOgEDz35BrBcBal1-_w/TweetDetail',
];

const fallbackGqlMap = Object.fromEntries(fallbackEndpoints.map((endpoint) => [endpoint.split('/')[3], endpoint]));

// Mutable gqlMap that can be updated with dynamic query IDs
let gqlMap: Record<string, string> = { ...fallbackGqlMap };

const updateGqlMap = (dynamicMap: Record<string, string>) => {
    for (const [endpoint, path] of Object.entries(dynamicMap)) {
        gqlMap[endpoint] = path;
    }
};

const thirdPartySupportedAPI = ['UserByScreenName', 'UserByRestId', 'UserTweets', 'UserTweetsAndReplies', 'SearchTimeline', 'UserMedia'];

const gqlFeatureUser = {
    hidden_profile_subscriptions_enabled: true,
    payments_enabled: false,
    rweb_xchat_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_twitter_article_notes_tab_enabled: true,
    subscriptions_feature_can_gift_premium: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
};

const gqlFeatureFeed = {
    rweb_video_screen_enabled: false,
    payments_enabled: false,
    rweb_xchat_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: true,
    responsive_web_grok_share_attachment_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    responsive_web_enhance_cards_enabled: false,
};

const gqlFeatures = {
    UserByScreenName: gqlFeatureUser,
    UserByRestId: gqlFeatureUser,
    UserTweets: gqlFeatureFeed,
    UserTweetsAndReplies: gqlFeatureFeed,
    UserMedia: gqlFeatureFeed,
    SearchTimeline: gqlFeatureFeed,
    TweetDetail: gqlFeatureFeed,
};

const bearerToken = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export { baseUrl, bearerToken, gqlFeatures, gqlMap, thirdPartySupportedAPI, updateGqlMap };
