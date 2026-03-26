import type { Context } from 'hono';

export type DataItem = {
    title: string;
    description?: string;
    pubDate?: number | string | Date;
    link?: string;
    category?: string[];
    author?:
        | string
        | Array<{
              name: string;
              url?: string;
              avatar?: string;
          }>;
    guid?: string;
    id?: string;
    image?: string;
    updated?: number | string | Date;
    language?: string;
    enclosure_url?: string;
    enclosure_type?: string;
    enclosure_title?: string;
    enclosure_length?: number;
    itunes_duration?: number | string;
    itunes_item_image?: string;
    media?: Record<string, Record<string, string>>;
    attachments?: Array<{
        url: string;
        mime_type: string;
        title?: string;
        size_in_bytes?: number;
        duration_in_seconds?: number;
    }>;
    _extra?: Record<string, any> & {
        links?: Array<{
            url: string;
            type: string;
            content_html?: string;
        }>;
    };
};

export type Data = {
    title: string;
    description?: string;
    link?: string;
    item?: DataItem[];
    allowEmpty?: boolean;
    image?: string;
    author?: string;
    language?: string;
    feedLink?: string;
    lastBuildDate?: string;
    atomlink?: string;
    ttl?: number;
};

export interface Namespace {
    name: string;
    url?: string;
    description?: string;
    lang?: string;
}

export enum ViewType {
    SocialMedia = 1,
    Pictures = 2,
}

export interface Route {
    path: string;
    example?: string;
    name: string;
    handler: (ctx: Context) => Promise<Data | Response> | Data | Response;
}
