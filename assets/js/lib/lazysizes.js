/**
 * Add lazysizes attrs to post/page content images to load a low-res placeholder
 */
function lazyloadContentImages() {
    const imgBlurDisbaled = document.documentElement.classList.contains('no-img-blur');
    const hasContent = document.body.classList.contains("post-template") || document.body.classList.contains("page-template");

    if (imgBlurDisbaled || !hasContent) {
        return;
    }

    const selectors = [
        ".kg-image-card img:not(.lazyload, .lazyloading, .lazyloaded, .lazyautosizes)",
        ".kg-gallery-image img:not(.lazyload, .lazyloading, .lazyloaded, .lazyautosizes)",
        ".kg-product-card .kg-product-card-image:not(.lazyload, .lazyloading, .lazyloaded, .lazyautosizes)",
    ];

    const images = Array.from(document.querySelectorAll(selectors.join(',')));

    images.forEach((img) => {

        // Skip if img already loaded or doesn't have width
        if (img.complete || img.naturalWidth !== 0 || !img.hasAttribute('width')) {
            return;
        }

        const srcset = img.getAttribute('srcset') || '';
        let tinySrc = null;

        if (img.src.startsWith('https://images.unsplash.com')) {
            const url = new URL(img.src);
            url.searchParams.set('w', 30);

            tinySrc = url.href;
        } else {
            const firstSrcset = srcset.split(',').shift() || '';
            const firstSrcsetSplit = firstSrcset.split(' ');
            const imgUrl = (firstSrcsetSplit[0] || '').trim();
            const imgW = (firstSrcsetSplit[1] || '').replace('w', '').trim();

            if (imgUrl && imgW && imgUrl.includes('/content/images/size/w' + imgW + '/')) {
                tinySrc = imgUrl.replace('/content/images/size/w' + imgW + '/', '/content/images/size/w30/');
            }
        }

        if (!tinySrc) {
            return;
        }

        img.setAttribute('srcset', tinySrc);
        img.setAttribute('data-srcset', srcset || img.src);
        img.setAttribute('data-sizes', "auto");
        img.removeAttribute('sizes');

        img.classList.add('lazyload');
    });

};

(function() {
    try {
        lazyloadContentImages();

        window.addEventListener("sx.posts.loaded", () => {
            lazyloadContentImages();
        });
    } catch (err) {
        if ("Sentry" in window) {
            return window.Sentry.captureException(err);
        }
    
        if (typeof window.reportError === "function") {
            return window.reportError(err);
        }
    
        console.error(err);
    }
})();