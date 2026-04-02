import { h, Fragment } from 'preact';
import { useContext, useEffect, useRef } from 'preact/hooks';
import { AppContext } from './AppContext';

/**
* @typedef {import("./types").Post} Post
* @typedef {import("./types").Author} Author
* @typedef {import("./types").Tag} Tag
*/

const DEFAULT_MAX_POSTS = 50;

/** @param {import("preact").JSX.SVGAttributes<SVGSVGElement>} props */
function IconSearch(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>        
    );
}

/** @param {import("preact").JSX.SVGAttributes<SVGSVGElement>} props */
function IconClear(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" width="24" fill="none" stroke="currentColor" stroke-width="2" focusable="false" aria-hidden="true">         
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>        
    );
}

/** @param {import("preact").JSX.SVGAttributes<SVGSVGElement>} props */
function IconLoader(props) {
    return (
        <svg {...props} version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xmlSpace="preserve" focusable="false" aria-hidden="true">
            <path opacity="0.2" fill="currentColor" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z" />
            <path fill="currentColor" d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0C22.32,8.481,24.301,9.057,26.013,10.047z">
                <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.5s" repeatCount="indefinite" />
            </path>
        </svg>
    );
}

/**
 * @param {Object} props 
 * @param {string} props.text 
 * @param {string} props.highlight 
 */
function getMatchIndexes({text, highlight}) {
    let highlightRegexText = '';
    highlight?.split(' ').forEach((d, idx) => {
        // escape regex syntax in search queries
        const e = String(d).replace(/\W/g, '\\&');
        if (idx > 0) {
            highlightRegexText += `|^` + e + `|\\s` + e;
        } else {
            highlightRegexText = `^` + e + `|\\s` + e;
        }
    });
    const matchRegex = new RegExp(`${highlightRegexText}`, 'ig');
    let matches = text?.matchAll(matchRegex);
    const indexes = [];
    for (const match of matches) {
        indexes.push({
            startIdx: match?.index,
            endIdx: (match?.index || 0) + (match?.[0].length || 0)
        });
    }

    return indexes;
}

/**
 * @param {Object} props 
 * @param {string} props.text 
 * @param {string} props.highlight 
 */
function getHighlightParts({ text, highlight }) {
    const highlightIndexes = getMatchIndexes({text, highlight});
    const parts = [];
    let lastIdx = 0;

    highlightIndexes.forEach((highlightIdx) => {
        if (lastIdx === highlightIdx.startIdx) {
            parts.push({
                text: text?.slice(highlightIdx.startIdx, highlightIdx.endIdx),
                type: 'highlight'
            });
            lastIdx = highlightIdx.endIdx;
        } else {
            parts.push({
                text: text?.slice(lastIdx, highlightIdx.startIdx),
                type: 'normal'
            });
            parts.push({
                text: text?.slice(highlightIdx.startIdx, highlightIdx.endIdx),
                type: 'highlight'
            });
            lastIdx = highlightIdx.endIdx;
        }
    });

    if (lastIdx < text?.length) {
        parts.push({
            text: text?.slice(lastIdx, text.length),
            type: 'normal'
        });
    }

    return {
        parts,
        highlightIndexes
    };
}

/**
 * @param {Object} props 
 * @param {string} props.word
 * @param {boolean} props.isExcerpt
 */
function HighlightWord({ word, isExcerpt }) {
    return (
        <span className={`font-bold ${!isExcerpt && "text-gray-950 dark:text-gray-50"}`}>{word}</span>
    );
}

function HighlightedSection({ text = '', highlight = '', isExcerpt = false }) {
    text = text || '';
    highlight = highlight || '';

    let { parts, highlightIndexes } = getHighlightParts({text, highlight});

    if (isExcerpt && highlightIndexes?.[0]) {
        const startIdx = highlightIndexes?.[0]?.startIdx;
        if (startIdx > 50) {
            text = '...' + text?.slice(startIdx - 20);
            const { parts: updatedParts } = getHighlightParts({text, highlight});
            parts = updatedParts;
        }
    }

    const wordMap = parts.map((d, idx) => {
        if (d?.type === 'highlight') {
            return (
                <HighlightWord key={idx} word={d.text} isExcerpt={isExcerpt} />
            );
        }

        return (
            <span key={idx}>{d.text}</span>
        );
        
    });

    return (
        <>
            {wordMap}
        </>
    );
}

/**
 * @param {Object} props
 * @param {Post} props.post
 */
function PostListItem({ post }) {
    const { searchValue } = useContext(AppContext);
    const { title, excerpt, url } = post;

    return (
        <a
            data-sx-search-item
            className={`py-3 -mx-2 sm:-mx-3.5 px-2 sm:px-3.5 cursor-pointer block rounded-xl focus:outline-none 
                hover:bg-gray-50 dark:hover:bg-gray-50/2 focus:bg-gray-100 dark:focus:bg-gray-50/5
            `}
            href={url}
        >
            <div className='text-base font-medium leading-tight text-gray-900 dark:text-gray-100'>
                <HighlightedSection text={title} highlight={searchValue} isExcerpt={false} />
            </div>
            <p className='text-gray-600 dark:text-gray-400 leading-normal text-sm mt-0 mb-0 truncate'>
                <HighlightedSection text={excerpt} highlight={searchValue} isExcerpt={true} />
            </p>
        </a>
    );
}

/**
 * @param {Object} props 
 * @param {Post[]} props.posts
 */
function PostResults({ posts }) {
    const {t, filter} = useContext(AppContext);

    if (!posts?.length) {
        return null;
    }

    return (
        <div className='flex flex-col py-3 px-4 sm:px-7 first:border-none border-t border-gray-950/5 dark:border-gray-50/5'>
            {!filter ? (
                <div className='uppercase text-xs text-gray-400 font-semibold mb-1 tracking-wide'>{t('Posts')}</div>
            ) : null}
            {posts?.slice(0, DEFAULT_MAX_POSTS).map(d => <PostListItem key={d.slug} post={d} />)}
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Tag} props.tag
 */
function TagListItem({ tag }) {
    const { searchValue } = useContext(AppContext);
    const { name, url } = tag;

    return (
        <a
            data-sx-search-item
            className={`py-3 -mx-2 sm:-mx-3.5 px-2 sm:px-3.5 cursor-pointer flex items-center rounded-xl focus:outline-none 
                hover:bg-gray-50 dark:hover:bg-gray-50/2 focus:bg-gray-100 dark:focus:bg-gray-50/5
            `}
            href={url}
        >
            <p className='me-2 text-sm font-bold text-gray-400'>#</p>
            <div className='text-base font-medium leading-tight text-gray-900 dark:text-gray-100 truncate'>
                <HighlightedSection text={name} highlight={searchValue} isExcerpt={false} />
            </div>
        </a>
    );
}

/**
 * @param {Object} props
 * @param {Tag[]} props.tags
 */
function TagResults({ tags }) {
    const { t } = useContext(AppContext);

    if (!tags?.length) {
        return null;
    }

    return (
        <div className='py-3 px-4 sm:px-7 first:border-none border-t border-gray-950/5 dark:border-gray-50/5'>
            <div className='uppercase text-xs text-gray-400 font-semibold mb-1 tracking-wide'>{t('Tags')}</div>
            {tags.map((d) => <TagListItem key={d.slug} tag={d} />)}
        </div>
    );
}

/**
 * @param {Object} props 
 * @param {Author} props.author
 */
function AuthorAvatar({ author }) {
    const { name, profile_image: avatar } = author;
    const character = name?.charAt(0);

    if (avatar?.length) {
        return (
            <img className='rounded-full bg-gray-200 dark:bg-gray-800 w-7 h-7 me-2 object-cover' src={avatar} alt={name} />
        );
    }

    if (character) {
        return (
            <div className='rounded-full bg-gray-200 dark:bg-gray-800 w-7 h-7 me-2 flex items-center justify-center font-bold border border-gray-950/5 dark:border-gray-50/5'>
                <span className="text-gray-800 dark:text-gray-200">{character}</span>
            </div>
        );
    }

    return null;
}


/**
 * @param {Object} props 
 * @param {Author} props.author
 */
function AuthorListItem({ author }) {
    const { searchValue } = useContext(AppContext);
    const { name, url } = author;

    return (
        <a
            data-sx-search-item
            className={`py-3 -mx-2 sm:-mx-3.5 px-2 sm:px-3.5 cursor-pointer flex items-center rounded-xl focus:outline-none 
                hover:bg-gray-50 dark:hover:bg-gray-50/2 focus:bg-gray-100 dark:focus:bg-gray-50/5
            `}
            href={url}
        >
            <AuthorAvatar author={author} />
            <div className='text-base font-medium leading-tight text-gray-900 dark:text-gray-100 truncate'>
                <HighlightedSection text={name} highlight={searchValue} isExcerpt={false} />
            </div>
        </a>
    );
}


/**
 * @param {Object} props 
 * @param {Author[]} props.authors
 */
function AuthorResults({ authors }) {
    const {t} = useContext(AppContext);

    if (!authors?.length) {
        return null;
    }

    return (
        <div className='py-3 px-4 sm:px-7 first:border-none border-t border-gray-950/5 dark:border-gray-50/5'>
            <div className='uppercase text-xs text-gray-400 font-semibold mb-1 tracking-wide'>{t('Authors')}</div>
            {authors.map((d) => <AuthorListItem key={d.slug} author={d} />)}
        </div>
    );
}

/**
 * @param {Object} props 
 * @param {Post[]} props.posts
 * @param {Author[]} props.authors
 * @param {Tag[]} props.tags
 */
function Results({ posts, authors, tags }) {
    /** @type {import("preact").RefObject<HTMLDivElement>} */
    const containerRef = useRef(null);

    useEffect(() => {
        /** @param {KeyboardEvent} event */
        const keyUphandler = (event) => {
            /** @type {HTMLAnchorElement[]} */
            const all = Array.from(containerRef.current?.querySelectorAll("[data-sx-search-item]") || []);
            
            if (!document.activeElement?.hasAttribute("data-sx-search-item")) {
                if (event.key === 'ArrowDown') {
                    all[0]?.focus();
                }          

                if (event.key === 'ArrowUp') {
                    all.at(-1)?.focus();
                }
            } else if (document.activeElement?.hasAttribute("data-sx-search-item")) {
                const currentIdx = all.findIndex(el => el === document.activeElement);
                const prev = all[currentIdx - 1];
                const next = all[currentIdx + 1];

                if (event.key === 'ArrowDown' && next) {
                    next?.focus();
                }          

                if (event.key === 'ArrowUp' && prev) {
                    prev?.focus();
                }
            }
        };

        window.addEventListener('keyup', keyUphandler);
        return () => window.removeEventListener('keyup', keyUphandler);
    }, []);
    
    return (
        <div ref={containerRef} className='scrollbar-width-thin overflow-y-auto max-h-[calc(100vh-172px)] sm:max-h-[70vh] -mt-px'>
            <AuthorResults authors={authors} />
            <TagResults tags={tags} />
            <PostResults posts={posts} />
        </div>
    );
}

function SearchResultBox() {
    const { searchValue = '', filter, searchIndex, indexStatus, t } = useContext(AppContext);

    let filteredTags = [];
    let filteredPosts = [];
    let filteredAuthors = [];

    if (indexStatus === "completed" && searchValue) {
        const searchResults = searchIndex?.search(searchValue || "");
        filteredPosts = searchResults?.posts || [];
        filteredAuthors = filter ? [] : searchResults?.authors || [];
        filteredTags = filter ? [] : searchResults?.tags || [];
    } else if (indexStatus === "completed" && !searchValue && filter) {
        const searchResults = searchIndex?.sample(DEFAULT_MAX_POSTS);
        filteredPosts = searchResults?.posts || [];
    }

    const hasResults = filteredPosts?.length || filteredAuthors?.length || filteredTags?.length;

    if (hasResults) {
        return (
            <>
                <div className="border-t border-gray-950/5 dark:border-gray-50/5"></div>
                <Results posts={filteredPosts} authors={filteredAuthors} tags={filteredTags} />
            </>
        );
    }
    
    if (searchValue && indexStatus === "completed") {
        return (
            <>
                <div className="border-t border-gray-950/5 dark:border-gray-50/5"></div>
                <div className='py-4 px-7'>
                    <p className='text-base leading-normal'>
                        {t('No matches found')}
                    </p>
                </div>
            </>
        );
    }
    
    if (indexStatus === "failed") {
        return (
            <>
                <div className="border-t border-gray-950/5 dark:border-gray-50/5"></div>
                <div className='py-4 px-7'>
                    <p className='text-base leading-normal'>
                        {t('Something went wrong, please try again.')}
                    </p>
                </div>
            </>
        );
    }

    return null;
}

function SearchBox() {
    const { setSearchValue, searchValue = '', setShowPopup, inputRef, indexStatus, t, } = useContext(AppContext);

    useEffect(() => {
        setTimeout(() => {
            inputRef?.current?.focus();
        }, 150);
    }, [inputRef]);

    return (
        <div className="z-10 relative flex items-center py-5 px-4 sm:px-7">
            <div className='flex-none flex items-center justify-center w-6 h-6 me-3'>
                {!searchValue ? (
                    <IconSearch 
                        className='flex-none w-6 h-6 text-gray-400 dark:text-gray-500' 
                        title={t('Quick search...')} 
                    />
                ) : null}

                {searchValue ? (
                    <button 
                        className='relative top-px w-6 h-6'
                        title={t('Clear')} 
                        onClick={() => setSearchValue('')}
                    >
                        <IconClear className='flex-none w-6 h-6 text-gray-400 hover:text-gray-950 dark:text-gray-500 dark:hover:text-gray-50 transition-colors' />
                    </button>
                ) : null}
            </div>

            <input
                ref={inputRef}
                value={searchValue || ''}
                onInput={(e) => setSearchValue(e.currentTarget.value)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                    }
                }}
                name="search"
                className='grow -my-4.5 py-4.5 -ms-3 ps-3 text-base leading-7 bg-transparent focus-visible:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none truncate'
                placeholder={t('Quick search...')}
                autoComplete="off"
            />

            {(!["completed", "failed"].includes(indexStatus) && searchValue) ? (
                <IconLoader className='flex-none h-7 w-7 ms-1 -me-1' />
            ) : null}

            <button
                className='sm:hidden ms-3 text-sm text-gray-500' 
                title={t('Close')}
                onClick={() => setShowPopup(false)}
            >
                {t('Close')}
            </button>
        </div>
    );
}

export function PopupModal() {
    const { setShowPopup, showPopup } = useContext(AppContext);

    /** @param {MouseEvent} e */
    const handleClose = (e) => {
        if (e.target === e.currentTarget) {
            setShowPopup(false);
        }        
    };

    useEffect(() => {
        /** @param {KeyboardEvent} event */
        const keyUpHandler = (event) => {
            if (event.key === 'Escape') {
                setShowPopup(false);
            }
        };

        window.addEventListener('keyup', keyUpHandler);
        return () => window.removeEventListener('keyup', keyUpHandler);
    }, [setShowPopup]);  
    
    useEffect(() => {
        const viewport = document.getElementById("sx-viewport");
        viewport?.toggleAttribute("inert", showPopup);
    }, [showPopup]);


    if (!showPopup) {
        return null;
    }

    return (
        <div className='fixed z-3999999 top-0 start-0 w-full h-full overflow-hidden has-animation' 
            style={{ '--animation-duration': '150ms' }} 
            role="dialog" 
            aria-modal="true"
        >
            <div
                onClick={handleClose}
                className='absolute inset-0 z-0 block bg-black/20 dark:bg-black/50 backdrop-blur-xs animate-fade'
            >
            </div>

            <div
                onClick={handleClose}
                className='h-screen w-screen pt-20 antialiased z-50 relative px-outer'
            >
                <div className='relative bg-white dark:bg-gray-950 w-full max-w-lg rounded-2xl shadow-pretty dark:shadow-xl m-auto translate-z-0 animate-slide-up'>
                    <div className="hidden dark:block absolute inset-0 -z-10 rounded-inherit bg-white/5 ring-1 ring-gray-50/10"></div>
                    <SearchBox />                    
                    <SearchResultBox />
                </div>
            </div>
        </div>            
    );
}

