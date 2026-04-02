declare global {
    interface Window {
        Spiritix: {
            t : Object<string, string>;
            safeReportError?: (err: any) => void;
        };
    }

    namespace Intl {
        interface Locale {
            getTextInfo?: () => { direction: "rtl" | "ltr" }
        }
    }
}

export type Tag = {
    id: string;
    slug: string;
    url: string;
    name: string;
}

export type Author = {
    id: string;
    slug: string;
    url: string;
    name: string;
    profile_image?: string;
}

export type Post = {
    id: string;
    slug: string;
    title: string;
    url: string;
    updated_at: string;
    excerpt?: string;
    visibility: string;
}

export type AppContextValue = {
    searchValue: string;
    setSearchValue: (_: string) => void;
    showPopup: boolean;
    setShowPopup: (_: boolean) => void;
    filter: string;
    searchIndex?: import("./SearchIndex.js").SearchIndex?;
    indexStatus: "initial" | "started" | "completed" | "failed",
    t: (_: string) => string;
    inputRef: import("preact").RefObject<HTMLInputElement>?;
}