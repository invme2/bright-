// Based on sodo-search v1.8.0
// https://github.com/TryGhost/Ghost/tree/main/apps/sodo-search

import Flexsearch, { Charset } from 'flexsearch';

const cjkEncoderPresetCodepoint = {
    /** @param {string[]} terms */
    finalize: (terms) => {
        let results = [];
     
        for (const term of terms) {
            results.push(...tokenizeCjkByCodePoint(term));
        }

        return results;
    }
};

/** @param {number} codePoint */
function isCJK(codePoint) {
    return (
        (codePoint >= 0x4E00 && codePoint <= 0x9FFF) || // CJK Unified Ideographs
        (codePoint >= 0x3040 && codePoint <= 0x30FF) || // Hiragana & Katakana (contiguous blocks)
        (codePoint >= 0xAC00 && codePoint <= 0xD7A3) || // Korean Hangul Syllables
        (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK Unified Ideographs Extension A
        (codePoint >= 0x20000 && codePoint <= 0x2A6DF) || // CJK Unified Ideographs Extension B
        (codePoint >= 0x2A700 && codePoint <= 0x2EBEF) || // CJK Unified Ideographs Extension C-F (contiguous blocks)
        (codePoint >= 0x30000 && codePoint <= 0x323AF) || // Additional ideographs
        (codePoint >= 0x2EBF0 && codePoint <= 0x2EE5F) || // More extensions
        (codePoint >= 0xF900 && codePoint <= 0xFAFF) || // Compatibility Ideographs
        (codePoint >= 0x2F800 && codePoint <= 0x2FA1F) // Supplementary ideographs
    );
}
  
/** @param {string} text  */
export function tokenizeCjkByCodePoint(text) {
    const result = [];
    let buffer = '';

    for (const char of text) { // loops over unicode characters
        const codePoint = char.codePointAt(0);

        if (codePoint && isCJK(codePoint)) {
            if (buffer) {
                result.push(buffer); // Push any non-CJK word we’ve been building
                buffer = '';
            }
            result.push(char); // Push the CJK char as its own token
        } else {
            buffer += char; // Keep building non-CJK text
        }
    }

    if (buffer) {
        result.push(buffer); // Push whatever is left when done
    }

    return result;
}

const encoderSet = new Flexsearch.Encoder({
        ...Charset.Default,
        ...cjkEncoderPresetCodepoint,
});

export class SearchIndex {
    /**
     * @param {Object} props 
     * @param {string} props.contentApiUrl 
     * @param {string} props.contentApiKey 
     * @param {('rtl' | 'ltr')=} props.dir 
     * @param {string=} props.filter
     */
    constructor({ contentApiUrl, contentApiKey, dir = "ltr", filter = "" }) {
        this.contentApiUrl = contentApiUrl;
        this.contentApiKey = contentApiKey;
        this.dir = dir;
        this.filter = filter;

        const rtl = (dir === 'rtl');
        const tokenize = (dir === 'rtl') ? 'reverse' : 'forward';

        this.postsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['title', 'excerpt'],
                store: true
            },
            encoder: encoderSet,
        });

        this.authorsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: encoderSet,
        });

        this.tagsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: encoderSet,
        });

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
        this.sample = this.sample.bind(this);
    }

    async #fetchFilteredPosts() {
        let posts = [];

        if (!this.filter) {
            return [];
        }

        const fetchPaginatedPosts = async (page = 1) => {
            const params = new URLSearchParams({
                filter: `tags:[${this.filter}]`,
                limit: "100", // Since Ghost v6, 100 is the max limit
                fields: 'id,slug,title,excerpt,url,updated_at,visibility',
                order: 'updated_at DESC',
                page: `${page}`,
            });
            const url = `${this.contentApiUrl}/posts/?key=${this.contentApiKey}&${params}`;
            const response = await fetch(url);
            const json = await response.json();      
            
            return json;
        }
        
        const firstPageJson = await fetchPaginatedPosts(1);
        posts = firstPageJson?.posts || [];

        if (firstPageJson?.meta?.pagination?.pages > 1) {
            const maxPages = Math.min(firstPageJson.meta.pagination.pages, 10); // Max 10 * 100 = 1000 posts

            const promises = [];
            for (let i = 2; i <= maxPages; i++) {
                promises.push(fetchPaginatedPosts(i));
            }

            const paginationData = await Promise.allSettled(promises);
            paginationData.forEach((d, i) => {
                if (d.status === 'rejected') {
                    console.error('Error fetching filtered posts with page=' + (i+2));
                    return;
                }
                posts.push(...(d.value?.posts || []));
            });
        }

        return posts;      
    }

    async #fetchPosts() {
        if (this.filter) {
            return this.#fetchFilteredPosts();
        }

        const url = `${this.contentApiUrl}/search-index/posts/?key=${this.contentApiKey}`;
        const response = await fetch(url);
        const json = await response.json();

        return json.posts;
    }

    async #fetchAuthors() {
        try {
            const url = `${this.contentApiUrl}/search-index/authors/?key=${this.contentApiKey}`;
            const response = await fetch(url);
            const json = await response.json();

            return json.authors;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching authors:', error);
            window.Spiritix.safeReportError?.(error);
            return [];
        }
    }
    
    async #fetchTags() {
        try {
            const url = `${this.contentApiUrl}/search-index/tags/?key=${this.contentApiKey}`;
            const response = await fetch(url);
            const json = await response.json();

            return json.tags;
        } catch (error) {
            console.error('Error fetching tags:', error);
            window.Spiritix.safeReportError?.(error);
            return [];
        }
    }   
    
    /** 
     * @param {import("./types").Post[]} posts 
     * */
    #updatePostIndex(posts) {
        posts.forEach((post) => {
            this.postsIndex.add(post);
        });
    }

    /** @param {import("./types").Author[]} authors */
    #updateAuthorsIndex(authors) {     
        authors.forEach((author) => {
            const invalidUrlRegex = /\/404\/$/;
            const hasInvalidURL = !author?.url || invalidUrlRegex.test(author.url);

            if (!hasInvalidURL) {
                this.authorsIndex.add(author);
            }
        });
    }

    /** @param {import("./types").Tag[]} tags */
    #updateTagsIndex(tags) {
        tags.forEach((tag) => {
            const invalidUrlRegex = /\/404\/$/;
            const hasInvalidURL = !tag?.url || invalidUrlRegex.test(tag.url);

            if (!hasInvalidURL) {
                this.tagsIndex.add(tag);
            }
        });
    }

    async init() {
        const [posts, authors, tags] = await Promise.all([
            this.#fetchPosts(),
            this.#fetchAuthors(),
            this.#fetchTags(),
        ]);

        if (posts.length > 0) {
            this.#updatePostIndex(posts);
        }

        if (authors.length > 0) {
            this.#updateAuthorsIndex(authors);
        }

        if (tags.length > 0) {
            this.#updateTagsIndex(tags);
        }
    }

    /** @param {import("flexsearch").EnrichedDocumentSearchResults<import("flexsearch").DocumentData>} result */
    #normalizeSearchResult(result) {
        /** @type {(import("flexsearch").DocumentData)[]} */
        const normalized = [];

        /** @type {Object<import("flexsearch").Id, import("flexsearch").DocumentData>} */
        const usedIds = {};

        result.forEach((resultItem) => {
            resultItem.result.forEach((doc) => {
                if (!usedIds[doc.id] && doc.doc) {
                    normalized.push(doc.doc);
                    usedIds[doc.id] = true;
                }
            });
        });

        return normalized;
    }

    /** @param {string} value */
    search(value) {
        const posts = this.postsIndex.search(value, {
            enrich: true
        });
        const authors = this.authorsIndex.search(value, {
            enrich: true
        });
        const tags = this.tagsIndex.search(value, {
            enrich: true
        });

        return {
            posts: this.#normalizeSearchResult(posts),
            authors: this.#normalizeSearchResult(authors),
            tags: this.#normalizeSearchResult(tags),
        };
    }

    sample(limit = 100) {
        const posts = [];

        if (this.postsIndex.store && typeof this.postsIndex.store[Symbol.iterator] === 'function') {
            for (const [_, data] of this.postsIndex.store) {
                if (posts.length >= limit) {
                    break;
                }
    
                data && posts.push(data);
            }
        }

        return {
            posts,
            authors: [],
            tags: [],
        };        
    }
}