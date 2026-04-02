// Lazy loaded js script

// -----------------------------------------------------------------------------
// Add lightbox to post/page content images

safeCall(() => {
    lightbox('.kg-image-card > .kg-image, .kg-gallery-image > img, .sx-has-zoom');

    window.addEventListener("sx.posts.loaded", () => {
        lightbox('.kg-image-card > .kg-image, .kg-gallery-image > img, .sx-has-zoom');
    });
});