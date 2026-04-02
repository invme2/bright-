import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PopupModal } from './PopupModal.jsx';
import { AppContext } from './AppContext.js';
import { SearchIndex } from './SearchIndex.js';

/**
 * @param {Object} props
 * @param {string} props.contentApiUrl
 * @param {string} props.contentApiKey
 * @param {"ltr" | "rtl"} props.dir
 */
export function App({ contentApiUrl, contentApiKey, dir }) {
    const [showPopup, setShowPopup] = useState(false);
    const [filter, setFilter] = useState("");
    const [searchValue, setSearchValue] = useState("");
    /** @type {{filter: string, status: "initial" | "started" | "completed" | "failed", index: import("./SearchIndex.js").SearchIndex, retries: number}[]} */
    const defaultIndexes = [];    
    const [indexes, setIndexes] = useState(defaultIndexes);
    /** @type {import("preact").RefObject<HTMLInputElement>} */
    const inputRef = useRef(null);
    /** @type {import("preact").RefObject<Number>} */
    const reqIdRef = useRef(null);

    const triggers = useMemo(() => {
        const selector = '[data-ghost-search]';
        return document.querySelectorAll(selector) || [];
    }, []);

    const startIndexing = useCallback((/** @type {string} */ filter) => {
        let currentIndex = indexes.find(idx => idx.filter === filter);

        // Create an index for the current filter if it doesn't exist
        if (!currentIndex) {
            currentIndex = {
                filter: filter || "",
                status: "initial",
                index: new SearchIndex({
                    contentApiUrl,
                    contentApiKey,
                    dir,
                    filter,
                }),
                retries: 0,
            };
            setIndexes(indexes.concat({...currentIndex}));
        }

        currentIndex = {...currentIndex};

        if (currentIndex.status === "initial") {
            currentIndex.status = "started";
            setIndexes(indexes => indexes.map(idx => {
                if (idx.filter === currentIndex.filter) {
                    return {...currentIndex};
                }
                return idx;
            }));

            const reqId = performance.now();
            reqIdRef.current = reqId;

            currentIndex.index.init()
                .then(() => {
                    currentIndex.status = "completed";                
                }).catch((error) => {
                    currentIndex.retries += 1;
                    currentIndex.status = currentIndex.retries >= 3 ? "failed" : "initial";
                    window.Spiritix.safeReportError?.(error);
                }).finally(() => {
                    const msBeforeRetry = currentIndex.status === "initial" ? 100 : 0;
                    setTimeout(() => {
                        if (reqId === reqIdRef.current) {
                            setIndexes(indexes => indexes.map(idx => {
                                if (idx.filter === currentIndex.filter) {
                                    return {...currentIndex};
                                }
                                return idx;
                            }));
                        }
                    }, msBeforeRetry);
                });
        }
    }, [indexes, contentApiUrl, contentApiKey, dir]);

    // Handle indexing
    useEffect(() => {
        if (!showPopup) {
            return;
        }
        
        startIndexing(filter);
    }, [showPopup, startIndexing]);    

    // Start indexing when mouse hover over trigger buttons with filter
    useEffect(() => {
        /** @param {Event} event */
        const handleMouseEnter = (event) => {
            event.preventDefault();
            if (event.currentTarget instanceof Element) {
                const trigger = event.currentTarget;
                const filter = trigger?.getAttribute("data-ghost-search")?.trim() || "";
                if (filter) {
                    startIndexing(filter);
                }
            }
        };

        triggers.forEach((t) => t.addEventListener('mouseenter', handleMouseEnter));
        return () => triggers.forEach((t) => t.removeEventListener('mouseenter', handleMouseEnter));
    }, [triggers, startIndexing]);

    // Open search when trigger buttons are clicked
    useEffect(() => {
        /** @param {Event} event */
        const handleClick = (event) => {
            event.preventDefault();
            if (event.currentTarget instanceof Element) {
                const trigger = event.currentTarget;
                const filter = trigger?.getAttribute("data-ghost-search")?.trim() || "";
                setFilter(filter);
            }

            setShowPopup(true);

            const tmpElement = document.createElement('input');
            tmpElement.style.opacity = '0';
            tmpElement.style.position = 'fixed';
            tmpElement.style.top = '0';
            document.body.appendChild(tmpElement);
            tmpElement.focus();

            setTimeout(() => {
                inputRef?.current?.focus();
                document.body.removeChild(tmpElement);
            }, 150);
        };

        triggers.forEach((t) => t.addEventListener('click', handleClick));
        return () => triggers.forEach((t) => t.removeEventListener('click', handleClick));
    }, [triggers]);

    // Open search modal when #/search hash is used
    useEffect(() => {
        const handleSearchUrl = () => {
            const [path] = window.location.hash.substring(1).split('?');
            if (path === '/search' || path === '/search/') {
                setShowPopup(true);
                window.history.replaceState('', document.title, window.location.pathname);
            }
        };
        handleSearchUrl();
        window.addEventListener('hashchange', handleSearchUrl, false);
        return () => window.removeEventListener('hashchange', handleSearchUrl, false);
    }, []);

    // Open search modal when cmd+k is used
    useEffect(() => {
        if (!triggers?.length) {
            return;
        }        
        /** @param {KeyboardEvent} e */
        const handleKeyDown = (e) => {
            if (e.key === 'k' && e.metaKey) {
                setShowPopup(true);
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [triggers]);

    // Cleanup
    useEffect(() => {
        document.body.classList.toggle("has-modal", showPopup);

        if (!showPopup) {
            reqIdRef.current = null;
            setSearchValue("");
            setFilter("");
            setIndexes(indexes => indexes.map(idx => {
                return {
                    ...idx,
                    status: idx.status !== "completed" ? "initial" : idx.status,
                    retries: 0,
                };
            }));
        }

        return () => document.body.classList.toggle("has-modal", false);
    }, [showPopup]);    

    const currentIndex = indexes.find(idx => idx.filter === filter);

    if (!currentIndex) {
        return null;
    }    

    /** @type {import("./types").AppContextValue} */
    const contextValue = {
        showPopup,
        setShowPopup,
        searchValue,
        setSearchValue,
        filter,
        searchIndex: currentIndex.index,
        indexStatus: currentIndex.status,
        t: (s) => window.Spiritix?.t?.[s] || s, 
        inputRef,           
    };

    return (
        <AppContext.Provider value={contextValue}>
            <PopupModal />
        </AppContext.Provider>
    );
}