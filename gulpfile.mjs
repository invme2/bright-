// @ts-check

import { createRequire } from 'node:module';
import { pipeline } from 'node:stream';
import gulp from 'gulp';

// gulp plugins and utils
import { deleteSync } from 'del';
import beeper from 'beeper';
import zipper from 'gulp-zip';
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';
import postcss from 'gulp-postcss';
import replace from 'gulp-replace';
import livereload from 'gulp-livereload';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import ordered from 'ordered-read-streams';

// postcss plugins
import tailwindcss from '@tailwindcss/postcss';
import fixTailwindv4ForLegacyBrowsers from './gulp/fixTailwindv4ForLegacyBrowsers.mjs';
import mediaMinMax from "postcss-media-minmax";
import autoprefixer from "autoprefixer";
import cssnano from 'cssnano';

const GENERATE_SOURCE_MAPS = false;
const require = createRequire(import.meta.url);
const { series, watch, src, dest, parallel } = gulp;

const serve = (done) => {
    livereload.listen();
    done();
};

const handleError = (done) => (err) => {
    if (err) {
        beeper();
    }
    return done && done(err);
};

const hbsTask = (done) => {
    return pipeline(
        src(['*.hbs', 'partials/**/*.hbs']),
        livereload(),
        handleError(done),
    );
};

const cssTask = (done) => {
    return pipeline(
        src('assets/css/main.css', { sourcemaps: GENERATE_SOURCE_MAPS }),
        concat('main.min.css'),
        postcss([
            tailwindcss({ optimize: true }),
        ]),
        dest('assets/built/', {sourcemaps: '.'}),
        livereload(),
        handleError(done),
    );
};

const legacyCssTask = (done) => {
    return pipeline(
        src('assets/css/main.css', { sourcemaps: GENERATE_SOURCE_MAPS }),
        concat('legacy.min.css'),
        postcss([
            tailwindcss({ optimize: { minify: false } }),
            fixTailwindv4ForLegacyBrowsers(),
            mediaMinMax(),
            autoprefixer(),
            cssnano(),
        ]),
        dest('assets/built/', {sourcemaps: '.'}),
        handleError(done),
    );
};

const mainJsTask = (done) => {   
    const pckg = require('./package.json');
    const theme = pckg.name;
    const version = pckg.version;

    const files = [
        './assets/js/lib/lazysizes.js',
        './node_modules/lazysizes/lazysizes.min.js',
        './node_modules/sal.js/dist/sal.js',
        './node_modules/reframe.js/dist/reframe.min.js',
        './node_modules/tocbot/dist/tocbot.min.js',
        './node_modules/prismjs/components/prism-core.min.js',
        './node_modules/prismjs/plugins/autoloader/prism-autoloader.min.js',
        './node_modules/prismjs/plugins/line-highlight/prism-line-highlight.min.js',
        './node_modules/prismjs/plugins/toolbar/prism-toolbar.min.js',
        './node_modules/prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard.min.js',
        './node_modules/@floating-ui/core/dist/floating-ui.core.umd.min.js',
        './node_modules/@floating-ui/dom/dist/floating-ui.dom.umd.min.js',
        './assets/js/main.js',
    ];

    return pipeline(
        ordered(files.map(file => src(file, {sourcemaps: GENERATE_SOURCE_MAPS}))),
        concat('main.min.js'),
        replace("__SPIRITIX_THEME_VERSION__", `${theme} v${version}`),
        uglify({ webkit: true }),
        dest('assets/built/', {sourcemaps: '.'}),
        // livereload(),
        handleError(done),
    );  
};

const lazyJsTask = (done) => {
    const files = [
        './node_modules/photoswipe/dist/photoswipe.min.js',
        './node_modules/photoswipe/dist/photoswipe-ui-default.min.js',
        './assets/js/lib/lightbox.js',
        './assets/js/lazy.js',
    ];

    return pipeline(
        ordered(files.map(file => src(file, {sourcemaps: GENERATE_SOURCE_MAPS}))),
        concat('lazy.min.js'),
        uglify(),
        dest('assets/built/', {sourcemaps: '.'}),
        // livereload(),
        handleError(done),
    );      
};

const searchJsTask = async () => {
    const bundle = await rollup({
        input: './assets/js/search/index.jsx',
        jsx: {
            mode: 'classic',
            factory: 'h',
            fragment: 'Fragment',
            importSource: 'preact',
        },
        plugins: [
            nodeResolve(),
        ],
    });

    await bundle.write({
        dir: "assets/built/search",
        entryFileNames: "[name].min.js",
        plugins: [
            terser(),
        ],
    });

    await bundle.close();   
};

const clean = async () => {
    return deleteSync([
        'assets/built/search/**',
    ]);
};

const reload = (done) => {
    return  pipeline(
        src(['assets/built/**/*.js', 'assets/built/**/*.css']),
        livereload(),
        handleError(done),
    );
}

const zipTask = (done) => {
    const pckg = require('./package.json');
    const filename = pckg.name + '.zip';

    return pipeline(
        src([
            '**',
            '!.DS_Store',
            '!.git', '!.git/**',
            '!node_modules', '!node_modules/**',
            '!dist', '!dist/**',
            '!demo', '!demo/**',
            '!package-lock.json',
            '!yarn-error.log',
            '!yarn.lock',
            '!TODO.md',
        ], { dot: true }),
        zipper(filename),
        dest('dist/'),
        handleError(done),
    );
};

const jsTask = series(clean, parallel(mainJsTask, lazyJsTask, searchJsTask), reload);
const cssWatcher = () => watch('assets/css/**', cssTask);
const jsWatcher = () => watch('assets/js/**', parallel(jsTask, cssTask));
const hbsWatcher = () => watch(['*.hbs', 'partials/**/*.hbs'], series(cssTask, hbsTask));
const watcher = parallel(cssWatcher, jsWatcher, hbsWatcher);
const buildAll = series(jsTask, cssTask, legacyCssTask);

export const css = series(cssTask, legacyCssTask);
export const legacyCss = legacyCssTask;
export const js = jsTask;
export const build = buildAll;
export const zip = series(build, zipTask);
export default series(build, serve, watcher);