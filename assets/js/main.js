// @ ts-check

// -----------------------------------------------------------------------------
// Helpers & Globals

function safeReportError(err) {
    if ("Sentry" in window) {
        return window.Sentry.captureException(err);
    }

    if (typeof window.reportError === "function") {
        return window.reportError(err);
    }

    console.error(err);
}

function safeCall(fn) {
    try {
        fn()
    } catch (err) {
        safeReportError(err);
    }
}

function focusOptionsSupported () {
    let supported = false;

    try {
        document.createElement('div').focus({
            get preventScroll() { return supported = true; }
        });
    } catch (err) {
        supported = false;
        safeReportError(err);
    }

    return supported;
}

safeCall(() => {
    window.Spiritix = window.Spiritix || {};
    window.Spiritix.version = "__SPIRITIX_THEME_VERSION__";
});


// -----------------------------------------------------------------------------
// Init animations

safeCall(() => {
    const isLandingPage = document.body.classList.contains('page-landing');
    const animationEnabled = isLandingPage && document.querySelector('.tag-hash-landing-animate');
    
    if (animationEnabled) {
        sal({ threshold: 0.05 });
    }
});


// -----------------------------------------------------------------------------
// Responsive menu

safeCall(() => {
    const menu = document.getElementById("sx-mobile-menu");
    const toggle = document.getElementById("sx-mobile-menu-toggle");
    const closeBtns = (menu && menu.querySelectorAll("[data-sx-mobile-menu-close]")) || [];

    const extraMenuClassWhenOpen = 'open';
    const extraBodyClassWhenOpen = 'has-modal';

    if (!toggle || !menu) {
        return;
    }

    const open = () => {
        menu.classList.add(extraMenuClassWhenOpen);
        document.body.classList.add(extraBodyClassWhenOpen);
    }

    const close = () => {
        menu.classList.remove(extraMenuClassWhenOpen);
        document.body.classList.remove(extraBodyClassWhenOpen);
    }

    toggle.addEventListener("click", () => {
        open();
    });

    closeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            close();
        });
    });
});

// -----------------------------------------------------------------------------
// Comments menu

safeCall(() => {
    
    const handleComments = (toggle) => {
        const menuId = toggle?.getAttribute("data-sx-comments-toggle") || "";
        const menu = document.querySelector(`[data-sx-comments="${menuId}"]`);
        const closeBtns = menu?.querySelectorAll("[data-sx-comments-close]") || [];
    
        const extraMenuClassWhenOpen = 'open';
        const extraBodyClassWhenOpen = 'has-modal';
    
        if (!toggle || !menu) {
            return;
        }
    
        const open = () => {
            menu.classList.add(extraMenuClassWhenOpen);
            document.body.classList.add(extraBodyClassWhenOpen);
        }
    
        const close = () => {
            menu.classList.remove(extraMenuClassWhenOpen);
            document.body.classList.remove(extraBodyClassWhenOpen);
        }
    
        toggle.addEventListener("click", () => {
            open();
        });
    
        closeBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                close();
            });
        });
    }

    const toggles = document.querySelectorAll("[data-sx-comments-toggle]");
    toggles.forEach(toggle => handleComments(toggle));

    // Handle comments for the feed template pagination
    window.addEventListener("sx.posts.loaded", (e) => {
        const feedPosts = (e.detail?.posts || []).filter(p => p.getAttribute("data-sx-pagination-post")?.startsWith('sx-feed-'));
        feedPosts.forEach(post => {
            const toggle = post.querySelector("[data-sx-comments-toggle]");
            if (!toggle) {
                return;
            }

            Array.from(post.querySelectorAll("script[data-ghost-comments]"))
            .forEach( oldScriptEl => {
                const newScriptEl = document.createElement("script");
                
                Array.from(oldScriptEl.attributes).forEach(attr => {
                    newScriptEl.setAttribute(attr.name, attr.value) 
                });
                
                oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
            });            
            handleComments(toggle);
        });
    });        

    // Open comments from email link
    if (location.hash === "#ghost-comments-root" || location.hash === "#ghost-comments") {
        setTimeout(() => toggles[0]?.click());
    }    
});


// -----------------------------------------------------------------------------
// Comments count

safeCall(() => {
    const handleCount = (countElement) => {
        const observer = new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
                    setTimeout(() => {
                        const count = Number(countElement.innerText.trim());
                        if (!isNaN(count) && count > 1000) {
                            countElement.textContent = "+999";
                        }
                        !isNaN(count) && count > 0 && countElement.removeAttribute("hidden");
                        observer.disconnect();
                    });
                }
            }
        });    
    
        const config = { attributes: false, childList: true, subtree: false };
        observer.observe(countElement, config);
    };

    const countElements = document.querySelectorAll("[data-sx-comments-count]");
    countElements.forEach(countElement => handleCount(countElement));

    // Handle comments count for the feed template pagination
    window.addEventListener("sx.posts.loaded", (e) => {
        const feedPosts = (e.detail?.posts || []).filter(p => p.getAttribute("data-sx-pagination-post")?.startsWith('sx-feed-'));
        if (feedPosts.length === 0) {
            return;
        }

        feedPosts.forEach(post => {
            const countElements = post.querySelectorAll("[data-sx-comments-count]");
            countElements.forEach(countElement => handleCount(countElement));
        });

        
        const oldScriptEl = document.head.querySelector("script[data-ghost-comments-counts-api]");
        if (!oldScriptEl) {
            return;
        }

        const newScriptEl = document.createElement("script");
        
        Array.from(oldScriptEl.attributes).forEach(attr => {
            newScriptEl.setAttribute(attr.name, attr.value) 
        });
        
        oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
    });
});

// -----------------------------------------------------------------------------
// Theme toggle

safeCall(() => {   
    const buttons = document.querySelectorAll("[data-sx-theme-toggle]") || [];

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
                localStorage.setItem('sx-theme', 'light');
            } else {
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
                localStorage.setItem('sx-theme', 'dark');
            }

            // Ghost native comments sets the color scheme once on page load
            // We need to reload the comments iframe when the user changes the color scheme
            safeCall(() => {
                const commentsIframe = document.querySelector("#ghost-comments-root > iframe");
                if (commentsIframe) {
                    commentsIframe.style.visibility = "hidden";
                    commentsIframe.contentWindow.location.reload();
                    setTimeout(() => {
                        commentsIframe.style.visibility = "visible";
                    }, 300);
                }
            });
        });
    });
});


// -----------------------------------------------------------------------------
// Menu dropdowns

safeCall(() => {
    const dropdownToggles = document.querySelectorAll('[data-sx-nav] [data-sx-dropdown-toggle]') || [];
    dropdownToggles.forEach(toggle => {
        const dropdown = toggle.nextElementSibling;
        const dropdownIsInline = !!dropdown && dropdown.getAttribute('data-sx-dropdown') === "inline";
    
        if (!dropdown || !dropdown.hasAttribute('data-sx-dropdown')) {
            return;
        }

        const handleClickOutside = (event) => {
            if (!dropdown.contains(event.target) && !toggle.contains(event.target) && !dropdownIsInline) {
                toggle.classList.remove('open');
            }
        }
        
        const updateDropdownPosition = () => {
            const options = {
                placement: 'bottom-end',
                middleware: [
                    FloatingUIDOM.offset({ mainAxis: 20, alignmentAxis: -16 }),
                    FloatingUIDOM.flip(),
                    FloatingUIDOM.shift({ padding: 20 }),
                ],
            };

            FloatingUIDOM.computePosition(toggle, dropdown, options).then(({x, y}) => {
                Object.assign(dropdown.style, {
                    'inset-inline-start': `${x}px`,
                    'top': `${y}px`,
                });
            });   
        }      
        
        let cleanupAutoUpdate = () => {};
    
        toggle.addEventListener('click', () => {
            if (toggle.classList.contains('open')) {
                toggle.classList.remove('open');
                document.removeEventListener("click", handleClickOutside, true);
                cleanupAutoUpdate();
            } else {
                toggle.classList.add('open');
                document.addEventListener("click", handleClickOutside, true);
                cleanupAutoUpdate = dropdownIsInline ? cleanupAutoUpdate : FloatingUIDOM.autoUpdate(
                    toggle,
                    dropdown,
                    updateDropdownPosition,
                    { ancestorScroll: false }
                );
            }
        });
        
        // Add "current" class to the dropdown toggle if the dropdown contains an active/current link
        if (toggle.id === 'sx-nav-more-toggle') {
            const allNestedCurrentLinks = Array.from(dropdown.querySelectorAll('a.current, a.current-parent'));     

            const checkCurrentLinks = () => {
                const allHidden = allNestedCurrentLinks.every(link => {
                    let dropdownItem = link.parentElement;
    
                    // nested dropdown case: link < li < ul < li
                    if (dropdownItem?.parentElement?.getAttribute('data-sx-dropdown') === "inline") {
                        dropdownItem = dropdownItem.parentElement.parentElement;
                    }
                    return getComputedStyle(dropdownItem).display === "none";
                });

                toggle.classList.toggle('current', !allHidden);
            };
            
            checkCurrentLinks();
            window.addEventListener('resize', () => {
                requestAnimationFrame(checkCurrentLinks);
            }, { passive: true });
            
        } else {
            const nestedCurrent = dropdown.querySelector(':not(.peer.hidden ~ .peer, .peer.hidden) > a.current, :not(.peer.hidden ~ .peer, .peer.hidden) > a.current-parent');     
            !!nestedCurrent && toggle.classList.add('current');
        }
    });
});


// -----------------------------------------------------------------------------
// Collapsible sidebar groups

safeCall(() => {
    const menu = document.querySelector('[data-sx-sidebar]');

    // open / close groups
    const toggles = menu?.querySelectorAll('[data-sx-sidebar-group-toggle]');
    toggles?.forEach(h => {
        h.addEventListener("click", () => {
            const group = h.closest('[data-sx-sidebar-group]');
            group?.classList.toggle('open');
        });
    });
});


// -----------------------------------------------------------------------------
// Scroll the doc sidebar to current link

safeCall(() => {
    const menu = document.querySelector('[data-sx-sidebar]');
    if (!menu) {
        return;
    }    

    const scroller = menu.querySelector('[data-sx-sidebar-scroller]');
    const currentPost = menu.querySelector('a[data-sx-sidebar-link].current');
    if (!currentPost || !scroller) {
        return;
    }
    
    const progress = menu.querySelector('[data-sx-progress]');
    if (!progress) {
        currentPost.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
    }
    
    const scrollerRect = scroller.getBoundingClientRect();
    const linkRect = currentPost.getBoundingClientRect();
    const progressRect = progress.getBoundingClientRect();
    
    // Progress bar hidden (mobile) -> scroll normally
    if (progressRect.top === 0 && progressRect.bottom === 0) {
        currentPost.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
    }
    
    const threshold = 32;
    const isViewable = (linkRect.top >= scrollerRect.top) && (linkRect.bottom <= scrollerRect.bottom);
    const isBehindProgressBar = linkRect.bottom > (progressRect.top - threshold);

    if (!isViewable) {
        currentPost.style.scrollMarginBottom = (threshold + progressRect.height) + "px";
        currentPost.scrollIntoView({ block: "end", inline: "nearest" });
        return;
    }

    if(isBehindProgressBar) {
        scroller.scrollTop += linkRect.bottom - (progressRect.top - threshold);
    }
});


// -----------------------------------------------------------------------------
// Doc responsive menu

safeCall(() => {
    const breadcrumbsBtn = document.querySelector('[data-sx-breadcrumbs-button]');
    const docsMenu = document.querySelector('[data-sx-sidebar]');
    const closeBtns = document.querySelectorAll('[data-sx-sidebar-close]');

    const extraMenuClassWhenOpen = 'open';
    const extraBodyClassWhenOpen = 'has-modal';

    if (!breadcrumbsBtn || !docsMenu) {
        return;
    }

    const open = () => {
        docsMenu.classList.add(extraMenuClassWhenOpen);
        document.body.classList.add(extraBodyClassWhenOpen);
    }

    const close = () => {
        docsMenu.classList.remove(extraMenuClassWhenOpen);
        document.body.classList.remove(extraBodyClassWhenOpen);
    }

    breadcrumbsBtn.addEventListener("click", () => {
        open();
    });

    closeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            close();
        });
    });    
});


// -----------------------------------------------------------------------------
// Docs Next & Prev & Breadcrumbs

safeCall(() => {
    const menu = document.querySelector('[data-sx-sidebar]');
    const prevLink = document.querySelector('[data-sx-prev]');
    const nextLink = document.querySelector('[data-sx-next]');

    if (!menu) {
        return;
    }

    const links = Array.from(menu.querySelectorAll('a[data-sx-sidebar-link]'));
    const currentPostIndex = links.findIndex(({ classList }) => classList.contains('current'));
    
    const indexPage = links[0]; 
    const prevPost = links[currentPostIndex - 1];
    const currentPost = links[currentPostIndex];
    const nextPost = links[currentPostIndex + 1];

    // Set parent doc nav link as current
    // This is only needed when a documentation collection is set on index (/)
    // For other paths, this is already handled by Ghost adding class 'current-parent' to nav links
    if (currentPost && currentPost !== indexPage) {
        const currentSlug = currentPost.getAttribute('data-sx-slug') || '';
        const navLinks = Array.from(document.querySelectorAll('#sx-header [data-sx-nav] a') || []);
        const hasCurrent = navLinks.some(l => l.classList.contains('current') || l.classList.contains('current-parent'));

        if (!hasCurrent) {
            for(let i = 0; i < navLinks.length; i++) {
                if (navLinks[i].href === currentPost.href.replace(currentSlug + "/", '')) {
                    navLinks[i].classList.add('current');
                    break;
                }
            }    
        }
    }

    if (currentPost) {
        const sectionName = currentPost.getAttribute('data-sx-group');   
        
        const breadcrumbsSectionElement = document.querySelector("[data-sx-breadcrumbs-section]");
        const breadcrumbsSectionTextElement = document.querySelector("[data-sx-breadcrumbs-section-text]");
        const breadcrumbsCurrentElement = document.querySelector("[data-sx-breadcrumbs-current]");

        if (sectionName && breadcrumbsSectionElement && breadcrumbsSectionTextElement && !menu.parentElement.classList.contains('no-groups')) {
            breadcrumbsSectionTextElement.textContent = sectionName;
            breadcrumbsSectionElement.removeAttribute('hidden');
        }

        if (breadcrumbsCurrentElement) {
            breadcrumbsCurrentElement.textContent = currentPost.getAttribute('data-sx-title');
            breadcrumbsCurrentElement.removeAttribute('hidden');
        }

        const progressCount = menu.querySelector('[data-sx-progress] [data-sx-progress-count]');  
        const progressBar = menu.querySelector('[data-sx-progress] [data-sx-progress-bar]');
        if (progressCount && progressBar && links.length > 0) {
            progressCount.textContent = (currentPostIndex + 1) + "/" + links.length;
            progressBar.style.width = Math.ceil(((currentPostIndex + 1) / links.length) * 100) + "%";
        }
    }
    

    if (prevPost && prevLink) {
        const textElement = prevLink.querySelector('[data-sx-prev-title]');
        const sectionElement = prevLink.querySelector('[data-sx-prev-group]');
        const sectionName = prevPost.getAttribute('data-sx-group');      
        const progressPrev = menu.querySelector('[data-sx-progress] [data-sx-progress-prev]');  

        if (sectionElement && sectionName) {
            sectionElement.textContent = " — " + sectionName;
        }        

        if (textElement) {
            prevLink.href = prevPost.href;
            textElement.textContent = prevPost.getAttribute('data-sx-title');
            prevLink.classList.remove('invisible');
            prevLink.classList.remove('max-sm:hidden');
        }
        
        if (progressPrev) {
            progressPrev.href = prevPost.href;
            progressPrev.classList.remove('opacity-50', 'pointer-events-none');
            progressPrev.classList.add("hover:bg-gray-900/8", "dark:hover:bg-gray-50/10");
        }
    }

    if (nextPost && nextLink && currentPostIndex !== -1) {
        const textElement = nextLink.querySelector('[data-sx-next-title]');
        const sectionElement = nextLink.querySelector('[data-sx-next-group]');
        const sectionName = nextPost.getAttribute('data-sx-group');
        const progressNext = menu.querySelector('[data-sx-progress] [data-sx-progress-next]');  

        if (sectionElement && sectionName) {
            sectionElement.textContent = " — " + sectionName;
        }

        if (textElement) {
            nextLink.href = nextPost.href;
            textElement.textContent = nextPost.getAttribute('data-sx-title');
            nextLink.classList.remove('invisible');
            nextLink.classList.remove('max-sm:hidden');
        }

        if (progressNext) {
            progressNext.href = nextPost.href;
            progressNext.classList.remove('opacity-50', 'pointer-events-none');
            progressNext.classList.add("hover:bg-gray-900/8", "dark:hover:bg-gray-50/10");
        }        
    }
});


// -----------------------------------------------------------------------------
// Add class to header when it becomes stuck (when position sticky takes effect)

safeCall(() => {
    const header = document.getElementById("sx-header");
    const classWhenStuck = "stuck";

    const check = () => {
        header.classList.toggle(classWhenStuck, window.scrollY > 0);
    };
    
    window.addEventListener('scroll', () => {
        requestAnimationFrame(check);
    }, { passive: true });

    check();
});

// -----------------------------------------------------------------------------
// Open / Close things

safeCall(() => {
    const triggers = document.querySelectorAll('[data-sx-open]');
    triggers.forEach(t => {
        const targetId = t.getAttribute('data-sx-open');
        const target = document.getElementById(targetId);
        if (!target) {
            return;
        }

        const autoClose = target.hasAttribute('data-sx-auto-close');

        const handleClickOutside = (event) => {
            if (!autoClose) {
                return;
            }
            if (!target.parentElement.contains(event.target)) {
                target.classList.remove('open');
            }
        };    

        t.addEventListener("click", () => {
            if (target.classList.contains('open')) {
                target.classList.remove('open');
                document.removeEventListener("click", handleClickOutside, true);
            } else {
                target.classList.add('open');
                document.addEventListener("click", handleClickOutside, true);
            }                  
        });
    });
});


// -----------------------------------------------------------------------------
// Sticky course link

safeCall(() => {
    const courseLink = document.getElementById("sx-course-link-sticky");
    const heroBtn = document.getElementById("sx-hero-cta");
    if (!courseLink || !heroBtn) {
        return;
    }

    const classWhenStuck = "stuck";
    const margin = 64;

    const options = {
        rootMargin: `-${margin}px 0px 0px 0px`,
        threshold: 1.0,  
    };    
    const observer = new IntersectionObserver((entries) => {
        const heroBtnIsOut = entries.some((entry) => !entry.isIntersecting && entry.boundingClientRect.top <= margin);
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const courseLinkVisible = courseLink.getBoundingClientRect().top < vh;

        courseLink.classList.toggle(classWhenStuck, heroBtnIsOut && !courseLinkVisible);
    }, options);

    observer.observe(heroBtn);

});


// -----------------------------------------------------------------------------
// External links

safeCall(() => {
    const links = document.querySelectorAll('[data-sx-nav] a, .content a, .landing a.landing-kicker, [data-sx-cta] a') || [];

    links.forEach(link => {
        if (link.protocol !== "javascript:" && link.hostname !== location.hostname && !link.target) {
            link.classList.add('sx-external');
            link.target = "_blank";
        }

        link.removeAttribute('data-sx-check-external');

        // Fix some links that are always set by Ghost as external even when they're not (Product card button, ...)
        if (link.classList.contains('kg-product-card-button') && (link.protocol === "javascript:" || link.hostname === location.hostname)) {
            link.removeAttribute("target");
            link.removeAttribute("rel");            
        }
    });
});


// -----------------------------------------------------------------------------
// Fix newsletter timeline 
// When two consecutive posts are posted one year appart but on the same month 
// (not handled by CSS)

function fixTimeline() {
    const timelinePosts = Array.from(document.querySelectorAll('[data-sx-timeline-post]'));

    for (let i = 0; i < timelinePosts.length - 1; i++) {
        const current = timelinePosts[i];
        const currentMonth = current.getAttribute('data-sx-timeline-month');
        const currentYear = current.getAttribute('data-sx-timeline-year');

        const next = timelinePosts[i + 1];
        const nextMonth = next.getAttribute('data-sx-timeline-month');
        const nextYear = next.getAttribute('data-sx-timeline-year');

        if (currentMonth === nextMonth && currentYear !== nextYear) {
            next.setAttribute('data-sx-timeline-break', '');
        }
    }
}

safeCall(() => fixTimeline());


// -----------------------------------------------------------------------------
// Pagination 

safeCall(function () {
    const feedElement = document.querySelector("[data-sx-pagination-feed]");
    const loadMoreBtn = document.querySelector("[data-sx-pagination-btn]");
    const nextElement = document.querySelector('link[rel=next]');
    
    if (!loadMoreBtn || !feedElement || !nextElement) {
        loadMoreBtn?.remove();
        return;
    }

    var loading = false;
    var currentPage = 1;
    var totalPages = Number(loadMoreBtn.getAttribute("data-sx-pagination-total")) ;

    // show the "Load more" button
    loadMoreBtn.classList.remove('hidden');
    loadMoreBtn.removeAttribute('hidden');

    function onPageLoad() {
        if (this.status >= 400) {
            loadMoreBtn.remove();
            return;
        }
        
        currentPage++;
        
        // Append contents
        var first = null;
        var postElements = this.response.querySelectorAll("[data-sx-pagination-post]");
        var postElementsCopy = [];

        var fragment = document.createDocumentFragment();

        const focusPoint = document.createElement("span");
        fragment.appendChild(focusPoint);

        postElements.forEach(function (item, index) {
            // document.importNode is important, without it the item's owner
            // document will be different which can break resizing of
            // `object-fit: cover` images in Safari
            var node = document.importNode(item, true);

            // var inlineScripts = node.querySelectorAll('script.sx-inline-script');
            // inlineScripts.forEach(is => {
            //     const script = document.createElement('script');
            //     script.textContent = is.textContent;
            //     is.parentElement.appendChild(script);
            //     is.remove();
            // });

            fragment.appendChild(node);
            postElementsCopy.push(node);

            if (index === 0) {
                first = node;
            }
        });

        feedElement.appendChild(fragment);      
        
        // The feed could be empty if posts are filtered, in this case we should try to load next page
        var shouldAutoLoadNext = postElementsCopy.length === 0 && currentPage < totalPages;

        setTimeout(() => {
            // Bring the focus back to the first element of the new page
            const focusOptions = focusOptionsSupported() ? { preventScroll: true } : undefined;
            focusPoint.setAttribute("tabindex", -1);
            focusPoint.focus(focusOptions);
            focusPoint.blur();
            focusPoint.remove();

            // Notify other parts of the app that new posts were loaded
            window.dispatchEvent(
                new CustomEvent("sx.posts.loaded", {
                    detail: { posts: postElementsCopy },
                })
            );            
        });

        // set next link
        var resNextElement = this.response.querySelector('link[rel=next]');;
        if (resNextElement) {
            nextElement.href = resNextElement.href;
        } else {
            shouldAutoLoadNext = false;
            loadMoreBtn.remove();
        }

        // sync status
        if (shouldAutoLoadNext) {
            loading = false;
            onClick();
        } else {
            loading = false;
            loadMoreBtn.classList.remove("loading");
    
            fixTimeline();
        }
    }

    function onClick() {
        if (loading) {
            return;
        }

        loading = true;
        loadMoreBtn.classList.add("loading");

        var xhr = new window.XMLHttpRequest();
        xhr.responseType = "document";

        xhr.addEventListener("load", onPageLoad);

        xhr.open("GET", nextElement.href);
        xhr.send(null);
    }

    loadMoreBtn.addEventListener("click", onClick);
});


// -----------------------------------------------------------------------------
// Table of contents

safeCall(() => {
    const tocContainer = document.querySelector("[data-sx-toc-container]");
    const tocSrc = document.querySelector("[data-sx-toc-src]");
    const tocTarget = document.querySelector("[data-sx-toc-target]");
    const isTocCollapsible = false;
    
    if (!tocbot || !tocSrc || !tocTarget || !tocContainer) {
        return;
    }

    tocbot.init({
        // Where to grab the headings to build the table of contents.
        contentElement: tocSrc,
        // Where to render the table of contents.
        tocElement: tocTarget,
        // Which headings to grab inside of the contentSelector element.
        headingSelector: 'h1, h2, h3',
        // Headings that match the ignoreSelector will be skipped.
        ignoreSelector: '.js-toc-ignore, .js-toc-ignore h1, .js-toc-ignore h2, .js-toc-ignore h3, .kg-card h1, .kg-card h2, .kg-card h3, .gh-post-upgrade-cta h2',        
        // For headings inside relative or absolute positioned containers within content.
        hasInnerContainers: true,
        // ignore headings that are hidden in DOM
        ignoreHiddenElements: true,
        // Extra classes to add to links.
        extraLinkClasses: (isTocCollapsible ? " [.toc-list.is-collapsed_&]:hidden ": "") + "flex py-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200",        
        // Class to add to active links,
        activeLinkClass: "current text-gray-700 font-medium -tracking-xs",
        // How many heading levels should not be collapsed.
        collapseDepth: 2,
        // Headings offset between the headings and the top of the document (this is meant for minor adjustments).
        headingsOffset: 80, 
        // Smooth scroll offset
        scrollSmoothOffset: -80,      
        // keep the toc scroll position in sync with the content.
        disableTocScrollSync: true,    
    }); 

    tocContainer.parentElement.classList.remove("invisible");

    const tocLinks = tocTarget.querySelectorAll('.toc-list a');

    // Only show toc if we have at least two heading (the post title is always present)
    if (!tocLinks || tocLinks.length <= 1) {
        if (tocLinks?.[0]?.getAttribute('href') === "#___TOCBOT___") {
            tocLinks[0].remove();
        }

        return;
    }

    tocContainer.classList.remove("invisible");
    tocContainer.removeAttribute('hidden');

    // Scroll to top
    const tocScrollToTopBtn = tocContainer.querySelector('[data-sx-toc-top]');
    tocScrollToTopBtn && tocScrollToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});


// -----------------------------------------------------------------------------
// Responsive video in post/page content

safeCall(() => {
    const sources = [
        '.content .kg-embed-card iframe[src*="youtube.com"]',
        '.content .kg-embed-card iframe[src*="youtube-nocookie.com"]',
        '.content .kg-embed-card iframe[src*="player.vimeo.com"]',
        '.content .kg-embed-card iframe[src*="dailymotion.com"]',
        '.content .kg-embed-card iframe[src*="embed.ted.com"]',
        '.content .kg-embed-card iframe[src*="kickstarter.com"][src*="video.html"]',
        '.content .kg-embed-card object',
        '.content .kg-embed-card embed',
    ];
    reframe(document.querySelectorAll(sources.join(',')));
});


// -----------------------------------------------------------------------------
// Make post/page tables responsive

safeCall(() => {
    document.querySelectorAll(".ghost-content table, .content table").forEach((table) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("table-responsive");

        table.parentElement.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
});


// -----------------------------------------------------------------------------
// Share buttons

safeCall(() => {
    const handleShare = (btn) => {
        const dropdown = btn.nextElementSibling;
        if (!dropdown || !dropdown.hasAttribute("data-sx-share-dropdown")) {
            return;
        }

        const handleClickOutside = (event) => {
            if (!btn.parentElement.contains(event.target)) {
                btn.classList.remove('open');
            }
        };

     
        const updateDropdownPosition = () => {
            const options = {
                placement: 'bottom-end',
                middleware: [
                    FloatingUIDOM.offset(12),
                    FloatingUIDOM.flip(),
                    FloatingUIDOM.shift({ padding: 20 }),
                ],
            };

            FloatingUIDOM.computePosition(btn, dropdown, options).then(({x, y}) => {
                Object.assign(dropdown.style, {
                    'inset-inline-start': `${x}px`,
                    'top': `${y}px`,
                });
            });   
        }

        let cleanupAutoUpdate = () => {};

        btn.addEventListener('click', () => {
            if (btn.classList.contains('open')) {
                btn.classList.remove('open');
                document.removeEventListener("click", handleClickOutside, true);
                cleanupAutoUpdate();
            } else {
                btn.classList.add('open');
                document.addEventListener("click", handleClickOutside, true);
                cleanupAutoUpdate = FloatingUIDOM.autoUpdate(
                    btn,
                    dropdown,
                    updateDropdownPosition,
                );
            }            
        });

        // Close on click
        dropdown.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                setTimeout(() => btn.click());
            });
        })

        // Copy to clipboard
        const copyToClipboardBtn = dropdown.querySelector("[data-sx-share-copy]");
        const copySuccess = dropdown.parentElement.querySelector("[data-sx-share-success]");
        copyToClipboardBtn?.addEventListener('click', () => {
            const text = copyToClipboardBtn.getAttribute('data-sx-share-copy') || location.href;

            navigator.clipboard?.writeText(text).then(() => {
                copySuccess?.classList.add('open');
                const options = {
                    placement: 'top',
                    middleware: [
                        FloatingUIDOM.offset(8),
                        FloatingUIDOM.flip(),
                        FloatingUIDOM.shift({ padding: 20 }),
                    ],
                };
    
                FloatingUIDOM.computePosition(btn, copySuccess, options).then(({x, y}) => {
                    Object.assign(copySuccess.style, {
                        'inset-inline-start': `${x}px`,
                        'top': `${y}px`,
                    });
                });                   
                setTimeout(() => copySuccess?.classList.remove('open'), 3000);
                btn.click();
            });
        });
    };
    
    const shareBtns = document.querySelectorAll("[data-sx-share]");
    shareBtns.forEach((btn) => handleShare(btn));

    // Handle share btns for the feed template pagination
    window.addEventListener("sx.posts.loaded", (e) => {
        const feedPosts = (e.detail?.posts || []).filter(p => p.getAttribute("data-sx-pagination-post")?.startsWith('sx-feed-'));
        feedPosts.forEach(post => {
            const shareBtns = post.querySelectorAll("[data-sx-share]");
            shareBtns.forEach((btn) => handleShare(btn));
        });
    });    
});


// -----------------------------------------------------------------------------
// Configure Prismjs

safeCall(() => {
    window.Prism = window.Prism || {};
    window.Prism.plugins = window.Prism.plugins || {};
    window.Prism.plugins.autoloader = window.Prism.plugins.autoloader || {};

    window.Prism.plugins.autoloader.languages_path = "https://cdn.jsdelivr.net/npm/prismjs@v1.29.0/components/";

    window.Prism.highlightAll();
});


// -----------------------------------------------------------------------------
// Feed template: next & prev links 

safeCall(() => {
    const isPost = document.body.classList.contains("post-template");
    const currentPosts = Array.from(document.querySelectorAll("[data-sx-pagination-post^=sx-feed-]"));
    const firstPost = currentPosts?.[0];
    const pinnedPost = firstPost?.classList.contains("featured") ? firstPost : null;

    // Single post case
    if (isPost && firstPost) {
        const nextLink = firstPost.querySelector("[data-sx-feed-next]");
        const prevLink = firstPost.querySelector("[data-sx-feed-prev]");
        
        const nextLinkHref = document.querySelector("[data-sx-next]")?.href;
        const prevLinkHref = document.querySelector("[data-sx-prev]")?.href;

        if (nextLink && nextLinkHref) {
            nextLink.href = nextLinkHref;
            nextLink.classList.remove("invisible", "opacity-50", "pointer-events-none");
        }

        if (prevLink && prevLinkHref) {
            prevLink.href = prevLinkHref;
            prevLink.classList.remove("invisible", "opacity-50", "pointer-events-none");
        }

        return;
    }


    // Listing case
    const showFeedNextAndPrevLinks = (posts) => {
        posts.forEach((post) => {    
            const prevPost = post.previousElementSibling;
            let nextPost = post.nextElementSibling;              

            // Remove this post if it's already pinned to the top. If pagination size equal 1, load next page unless we're on the first page
            if (pinnedPost && post !== pinnedPost && post.getAttribute("data-sx-pagination-post") === pinnedPost.getAttribute("data-sx-pagination-post")) {
                post.remove();
                if (posts !== currentPosts && posts.length === 1) {
                    const loadMoreBtn = document.querySelector("[data-sx-pagination-btn]");
                    if (!loadMoreBtn) {
                        const nextLink = prevPost?.querySelector("[data-sx-feed-next]");
                        nextLink?.classList.add("opacity-50", "pointer-events-none");
                    }
                    loadMoreBtn?.click();
                }
                return;
            }

            // if next sibling is a pinned post, set to null, it will be removed
            if (pinnedPost && nextPost && nextPost.getAttribute("data-sx-pagination-post") === pinnedPost.getAttribute("data-sx-pagination-post")) {
                nextPost = null;
            }

            if (prevPost?.hasAttribute("data-sx-pagination-post")) {
                // set next link on the prev post to current post 
                const nextLink = prevPost.querySelector("[data-sx-feed-next]");
                nextLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    post.scrollIntoView({ behavior: 'smooth' });
                });                
                nextLink.classList.remove("invisible", "opacity-50", "pointer-events-none");
    
                // set prev link on current post to prev post
                const prevLink = post.querySelector("[data-sx-feed-prev]");
                prevLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    prevPost.scrollIntoView({ behavior: 'smooth' });
                });
                prevLink.classList.remove("invisible", "opacity-50", "pointer-events-none");
            }

            if (!nextPost) {
                const loadMoreBtn = document.querySelector("[data-sx-pagination-btn]");

                if (loadMoreBtn) {
                    const nextLink = post.querySelector("[data-sx-feed-next]");
                    nextLink.addEventListener("click", (e) => {
                        e.preventDefault();
                        loadMoreBtn.scrollIntoView({ behavior: 'smooth' });
                        setTimeout(() => loadMoreBtn.click(), 100);
                    }, { once: true });   
                    nextLink.classList.remove("invisible", "opacity-50", "pointer-events-none");
                }
            }

        });
    };

    showFeedNextAndPrevLinks(currentPosts);

    window.addEventListener("sx.posts.loaded", (e) => {
        const newPosts = (e.detail?.posts || []).filter(p => p.getAttribute("data-sx-pagination-post")?.startsWith('sx-feed-'));
        showFeedNextAndPrevLinks(newPosts);
    });
});


// -----------------------------------------------------------------------------
// Fix comments dark accent color

window.addEventListener("DOMContentLoaded", () => safeCall(() => {
    const commentsIframe = document.querySelector("#ghost-comments-root > iframe");
    const accentLight = window.Spiritix.ghostAccentColorLightRgb;
    const accentDark = window.Spiritix.ghostAccentColorDarkRgb;

    const onLoad = (loadEvent) => safeCall(() => {
        const iframeDocument = loadEvent.target.contentDocument;
        const styleElement = iframeDocument.createElement('style');

        styleElement.textContent = ` 
            .dark [style*='background-color: rgb(${accentLight.split(" ").join(', ')})'] { 
                background-color: rgb(${accentDark}) !important; 
            }
            .dark [style*='color: rgb(${accentLight.split(" ").join(', ')})']:not([style*='-color: rgb(${accentLight.split(" ").join(', ')})']) { 
                color: rgb(${accentDark}) !important; 
            }
        `;

        iframeDocument.head.appendChild(styleElement);
    });

    if (commentsIframe && accentLight && accentDark) {
        commentsIframe.addEventListener("load", onLoad);
    }
}));

// -----------------------------------------------------------------------------
// Fix accessibility issues with some editor cards

safeCall(() => {
    // Toggle cards icon buttons don't have any text
    const toggleButtons = document.querySelectorAll('.kg-toggle-card-icon');
    toggleButtons.forEach(b => {
        if (!b.hasAttribute('aria-label')) {
            b.setAttribute('aria-label',  window.Spiritix.t["Toggle menu"] || "Toggle menu");
        }
    });

    // Product cards images don't have alt
    const productImages = document.querySelectorAll('.kg-product-card-image');
    productImages.forEach(img => {
        if (!img.hasAttribute('alt')) {
            img.setAttribute('alt', '');
        }
    });

    // Video cards have inputs without label
    const videoCards = document.querySelectorAll('.kg-video-card');
    videoCards.forEach((vel, i) => {
        const seekSlider = vel.querySelector(".kg-video-seek-slider");
        const volumeSlider = vel.querySelector(".kg-video-volume-slider");
        const parent = seekSlider && seekSlider.parentElement;

        if (!seekSlider || !volumeSlider || !parent) {
            return;
        }
    
        const seekId = `kg-video-ss-${i}`;
        const volumeId = `kg-video-vs-${i}`;
    
        seekSlider.id = seekSlider.id || seekId;
        volumeSlider.id = volumeSlider.id || volumeId;
    
        const seekLabel = document.createElement('label');
        seekLabel.htmlFor = seekId;
        seekLabel.innerText = "Video progress";
        seekLabel.classList.add('sr-only');
    
        const volumeLabel = document.createElement('label');
        volumeLabel.htmlFor = volumeId;
        volumeLabel.innerText = "Adjust volume";
        volumeLabel.classList.add('sr-only');
    
        parent.appendChild(seekLabel);
        parent.appendChild(volumeLabel);    
    });    

    // Signup cards have inputs without label
    const signupCardInputs = document.querySelectorAll('.kg-signup-card .kg-signup-card-input');
    signupCardInputs.forEach((input, i) => {
        input.id = input.id || `kg-singup-email-${i}`;

        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.innerText = input.getAttribute("placeholder") || "Email";
        label.classList.add('sr-only');   
        
        input.parentElement.appendChild(label);
    });
});


// -----------------------------------------------------------------------------
// Load lazy script

safeCall(() => {
    const canLoad = () => {
        const imageCards = document.querySelectorAll(".kg-image-card, .kg-gallery-image, .sx-has-zoom");
        return imageCards.length > 0;
    };

    const tmp = document.getElementById("sx-lazy-script");
    const src = tmp && tmp.getAttribute('data-src');
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    canLoad() && document.body.appendChild(script);
});