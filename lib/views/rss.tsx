import type { FC } from 'hono/jsx';

import type { Data } from '@/types';

const RSS: FC<{ data: Data }> = ({ data }) => (
    <rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
        <channel>
            <title>{data.title || 'rsshub-twitter-lite'}</title>
            <link>{data.link || 'https://x.com'}</link>
            <atom:link href={data.atomlink} rel="self" type="application/rss+xml" />
            <description>{data.description || data.title}</description>
            <generator>rsshub-twitter-lite</generator>
            <language>{data.language || 'en'}</language>
            {data.image && (
                <image>
                    <url>{data.image}</url>
                    <title>{data.title || 'rsshub-twitter-lite'}</title>
                    <link>{data.link}</link>
                </image>
            )}
            <lastBuildDate>{data.lastBuildDate}</lastBuildDate>
            <ttl>{data.ttl}</ttl>
            {data.item?.map((item) => (
                <item>
                    <title>{item.title}</title>
                    <description>{item.description}</description>
                    <link>{item.link}</link>
                    <guid isPermaLink="false">{item.guid || item.link || item.title}</guid>
                    {item.pubDate && <pubDate>{String(item.pubDate)}</pubDate>}
                    {item.author && <author>{typeof item.author === 'string' ? item.author : item.author.map((author) => author.name).join(', ')}</author>}
                    {typeof item.category === 'string' ? <category>{item.category}</category> : item.category?.map((category) => <category>{category}</category>)}
                    {item.enclosure_url && <enclosure url={item.enclosure_url} length={item.enclosure_length} type={item.enclosure_type} />}
                </item>
            ))}
        </channel>
    </rss>
);

export default RSS;
