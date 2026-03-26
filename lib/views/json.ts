import type { Data } from '@/types';

const json = (data: Data) =>
    JSON.stringify({
        version: 'https://jsonfeed.org/version/1.1',
        title: data.title,
        home_page_url: data.link,
        feed_url: data.feedLink || data.atomlink,
        description: data.description,
        icon: data.image,
        language: data.language || 'en',
        items: data.item?.map((item) => ({
            id: item.guid || item.id || item.link,
            url: item.link,
            title: item.title,
            content_html: item.description || item.title,
            summary: item.description,
            date_published: item.pubDate,
            authors: typeof item.author === 'string' ? [{ name: item.author }] : item.author,
            tags: item.category,
        })),
    });

export default json;
