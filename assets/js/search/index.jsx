import { render, h } from 'preact';
import { App } from './App.jsx';
import { direction } from './utils.js';

const ROOT_DIV_ID = 'sx-search-root';

function addRootDiv() {
    const root = document.createElement('div');
    root.id = ROOT_DIV_ID;
    document.body.appendChild(root);

    return root;
}

function getSiteData() {
    const contentApiUrl = document.documentElement.getAttribute("data-sx-content-api-url")?.replace(/\/+$/, '');
    const contentApiKey = document.documentElement.getAttribute("data-sx-content-api-key");
    const locale = document.documentElement.getAttribute("lang") || 'en';
    const dir = direction(locale) || "ltr";

    return { contentApiUrl, contentApiKey, locale, dir };
}

function init() {
    const { contentApiUrl, contentApiKey, dir } = getSiteData();

    const root = addRootDiv();

    if (!contentApiUrl || !contentApiKey) {
        throw Error("Spritix Search: Content API key or URL not found!");
    }

    render(
        <App 
            contentApiUrl={contentApiUrl} 
            contentApiKey={contentApiKey}
            dir={dir}
        />, 
        root,
    );
}

init();


