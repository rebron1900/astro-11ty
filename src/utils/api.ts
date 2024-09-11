import type { Page, Post } from '@ts-ghost/content-api';

import { TSGhostContentAPI } from '@ts-ghost/content-api';
import config from '../data/config';

const ghostUrl = import.meta.env.GHOST_API_URL;
const ghostApiKey = import.meta.env.GHOST_API_KEY;
const postLimit = import.meta.env.GHOST_API_POST_LIMIT;
const neodbURL = import.meta.env.NEODB_URL;
const fluxURL = import.meta.env.FLUX_URL;
const fluxKey = import.meta.env.FLUX_KEY;

export interface ExPost extends Post {
    type: string;
}

export const getAllAuthors = async () => {
    const api = new TSGhostContentAPI(ghostUrl, ghostApiKey, 'v5.0');
    const results = await api.authors
        .browse()
        .include({
            'count.posts': true
        })
        .fetch();
    if (!results.success) {
        throw new Error(results.errors.map((e) => e.message).join(', '));
    }
    return {
        authors: results.data,
        meta: results.meta
    };
};

export const getPosts = async () => {
    const api = new TSGhostContentAPI(ghostUrl, ghostApiKey, 'v5.0');
    const results = await api.posts
        .browse()
        .include({
            authors: true,
            tags: true
        })
        .fetch();
    if (!results.success) {
        throw new Error(results.errors.map((e) => e.message).join(', '));
    }
    return {
        posts: results.data,
        meta: results.meta
    };
};

export const getAllPosts = async () => {
    const api = new TSGhostContentAPI(ghostUrl, ghostApiKey, 'v5.0');
    const posts: Post[] = [];
    let cursor = await api.posts
        .browse()
        .include({
            authors: true,
            tags: true
        })
        .paginate();
    if (cursor.current.success) posts.push(...cursor.current.data);
    while (cursor.next && posts.length < postLimit) {
        cursor = await cursor.next.paginate();
        if (cursor.current.success) posts.push(...cursor.current.data);
    }

    const postsWithType = posts.map((post) => ({
        ...post,
        type: 'post' // 设置 type 字段的值
    }));

    return postsWithType;
};

export const getAllPages = async () => {
    const api = new TSGhostContentAPI(ghostUrl, ghostApiKey, 'v5.0');
    const pages: Page[] = [];
    let cursor = await api.pages
        .browse()
        .include({
            authors: true,
            tags: true
        })
        .paginate();
    if (cursor.current.success) pages.push(...cursor.current.data);
    while (cursor.next) {
        cursor = await cursor.next.paginate();
        if (cursor.current.success) pages.push(...cursor.current.data);
    }

    const pagesWithType = pages.map((page) => ({
        ...page,
        type: 'page' // 设置 type 字段的值
    }));

    return pagesWithType;
};

export const getSettings = async () => {
    const api = new TSGhostContentAPI(ghostUrl, ghostApiKey, 'v5.0');
    const res = await api.settings.fetch();
    if (res.success) {
        return res.data;
    }
    return null;
};
export type NonNullable<T> = T extends null | undefined ? never : T;

export type Settings = NonNullable<Awaited<ReturnType<typeof getSettings>>>;

export const getAllTags = async () => {
    const api = new TSGhostContentAPI(ghostUrl, ghostApiKey, 'v5.0');
    const results = await api.tags
        .browse({ limit: 'all', order: 'count.posts desc' })
        .include({
            'count.posts': true
        })
        .fetch();
    if (!results.success) {
        throw new Error(results.errors.map((e) => e.message).join(', '));
    }

    const postsAll = await getAllPosts();

    const tagsWithPost = results.data.map((tag) => {
        const posts = postsAll.filter((post) => {
            return post.primary_tag && post.primary_tag.slug === tag.slug;
        });

        return { ...tag, posts: posts };
    });

    return tagsWithPost;
};

export const getNeodb = async () => {
    return fetch(neodbURL).then((res) => res.json());
};

export async function getFlux() {
    try {
        const response = await fetch(fluxURL, {
            method: 'GET',
            headers: {
                'X-Auth-Token': fluxKey
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { entries } = await response.json();

        const uniqueEntries = entries.reduce((acc, entry) => {
            const domain = new URL(entry.feed.site_url).origin;
            entry.feed.site_url = domain;

            if (!acc.some((item) => item.feed_id === entry.feed_id)) {
                acc.push(entry);
            }

            return acc;
        }, []);

        return uniqueEntries;
    } catch (error) {
        console.error('请求错误:', error);
        return []; // Return an empty array or handle the error as needed
    }
}

export async function getMemos() {
    return fetch(config.memos.url).then((res) => res.json());
}
