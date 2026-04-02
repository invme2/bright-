/**
 * PhotoSwipe (aka Lightbox) 
 * @see https://github.com/dimsemenov/PhotoSwipe
 * 
 * @param {string} trigger A query selector of all elements to apply PhotoSwipe on
 */
function lightbox(trigger) {
    // Fix for images of unknown size, and for images of with > 2000
    // @see https://github.com/dimsemenov/PhotoSwipe/issues/796
    var onGettingData = (gallery) => (index, item) => {
        // If width and height already set and w <= 2000, then do nothing.
        // NOTE: Ghost resizes images to 2000px max, but for some reason set width attribute to original width > 2000
        // This causes blurry images when zoomed in, that's why we need the fix for w > 2000
        if (item.w && item.h && item.w <= 2000) {
            return;
        }

        // If the content img (thumbnail) is already loaded
        // then use the dimensions as fallback (same aspect ratio)
        if (!item.w && item.el && item.el.complete && item.el.naturalWidth !== 0) {
            item.w = item.el.naturalWidth;
            item.h = item.el.naturalHeight;
        }

        // Load the img and get the correct dimensions
        // then update the gallery size
        const img = new Image();
        img.onload = function () {
            item.w = this.width;
            item.h = this.height;
            gallery.updateSize(true);
        };
        img.src = item.src;
    };

    var onThumbnailsClick = function (e) {
        e.preventDefault();

        var items = [];
        var index = 0;

        // Add previous images/galleries if they're siblings
        var prevSibling = e.target.closest('.kg-card')?.previousElementSibling;
        while (prevSibling && (prevSibling.classList.contains('kg-image-card') || prevSibling.classList.contains('kg-gallery-card'))) {
            var prevItems = [];

            prevSibling.querySelectorAll('img').forEach(function (item) {
                prevItems.push({
                    src: item.getAttribute('src'),
                    msrc: item.getAttribute('src'),
                    w: item.getAttribute('width'),
                    h: item.getAttribute('height'),
                    el: item,
                })

                index += 1;
            });
            prevSibling = prevSibling.previousElementSibling;

            items = prevItems.concat(items);
        }

        // Add current image/gallery
        if (e.target.classList.contains('kg-image') || e.target.classList.contains('sx-has-zoom')) {
            items.push({
                src: e.target.getAttribute('src'),
                msrc: e.target.getAttribute('src'),
                w: e.target.getAttribute('width'),
                h: e.target.getAttribute('height'),
                el: e.target,
            });
        } else {
            var reachedCurrentItem = false;

            e.target.closest('.kg-gallery-card')?.querySelectorAll('img').forEach(function (item) {
                items.push({
                    src: item.getAttribute('src'),
                    msrc: item.getAttribute('src'),
                    w: item.getAttribute('width'),
                    h: item.getAttribute('height'),
                    el: item,
                });

                if (!reachedCurrentItem && item !== e.target) {
                    index += 1;
                } else {
                    reachedCurrentItem = true;
                }
            });
        }

        // Add next images/galleries if they're siblings
        var nextSibling = e.target.closest('.kg-card')?.nextElementSibling;
        while (nextSibling && (nextSibling.classList.contains('kg-image-card') || nextSibling.classList.contains('kg-gallery-card'))) {
            nextSibling.querySelectorAll('img').forEach(function (item) {
                items.push({
                    src: item.getAttribute('src'),
                    msrc: item.getAttribute('src'),
                    w: item.getAttribute('width'),
                    h: item.getAttribute('height'),
                    el: item,
                })
            });
            nextSibling = nextSibling.nextElementSibling;
        }

        var pswpElement = document.querySelectorAll('.pswp')[0];
        var errorMsg = pswpElement.getAttribute('data-error-msg') || "The image could not be loaded.";

        var options = {
            bgOpacity: 0.9,
            closeOnScroll: false,
            fullscreenEl: false,
            history: false,
            index: index,
            shareEl: false,
            zoomEl: false,
            loadingIndicatorDelay: 100,
            errorMsg: '<div class="pswp__error-msg">'+ errorMsg + '</div>',
            getThumbBoundsFn: function(index) {
                var thumbnail = items[index].el,
                    pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
                    rect = thumbnail.getBoundingClientRect();

                return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
            }
        }

        var gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);

        gallery.listen("gettingData", onGettingData(gallery));

        gallery.init();

        return false;
    };

    var triggers = document.querySelectorAll(trigger);
    triggers.forEach(function (trig) {
        trig.addEventListener('click', function (e) {
            onThumbnailsClick(e);
        });
    });
}