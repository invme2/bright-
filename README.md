# Bright

Bright is a multipurpose, premium Ghost theme with a beautiful landing page and powerful collections. Designed and developed by [Spiritix](https://spiritix.co/).

What you can create with this theme:
* A sleek, modern landing page fully managed from the admin UI. Use it as your homepage or an internal page to highlight a product, service, or key offering.
* Engaging text-based courses with structured lessons, making it easy to build your own minimal, subscription-based learning platform.
* A fully functional blog to share insights, updates, and industry knowledge with your audience.
* A dedicated newsletter page to grow your mailing list and keep your subscribers informed with regular updates.
* A well-organized documentation hub, ideal for guides, FAQs, or technical resources.
* A showcase section with dedicated external links, perfect for highlighting your best work, case studies, or even showcasing partners and collaborations.
* A long-form feed timeline, perfect for sharing ongoing thoughts, announcements, and keeping users informed of new updates.

&nbsp;

## Demo
See the theme in action in our live demo: [https://bright.spiritix.co](https://bright.spiritix.co/)

&nbsp;

## Documentation
An up to date documentation is available at [https://spiritix.co/themes/bright](https://spiritix.co/themes/bright/).

Please make sure to go through at least the installation instructions to get your site up and running.

&nbsp;

## Help & Support
Need support or have a suggestion? You can:
- contact us at [https://spiritix.co/contact](https://spiritix.co/contact)
- send an email to [support@spiritix.co](support@spiritix.co)
- DM us on X [https://x.com/SpiritixHQ](https://x.com/SpiritixHQ)

&nbsp;

## Development
### Prerequisite
First, you'll need [Node](https://nodejs.org/) installed globally. 

### Install dependencies
From the theme's root directory, run the following command to install dependencies:

```bash
# install dependencies
npm install
```

### Start development server
The following command starts a development server with Livereload enabled

```bash
# run development server
npm run dev
```

### Compile CSS
We use PostCSS and [TailwindCSS](https://tailwindcss.com/) to manage our CSS.
All CSS files in `/assets/css/` and imported in `/assets/css/main.css`, will be compiled to `/assets/built/main.min.css` automatically, in addition to any TailwindCSS utility class used in .hbs or .js files.

```bash
# compile CSS
npm run css
```

### Compile Javascript
Javascript files in `/assets/js/` will be compiled to `/assets/built/main.min.js` automatically.

```bash
# compile js
npm run js
```

### Build all assets
To compile all assets, run the following command:
```bash
# compile all assets
npm run build
```

### Test theme
To test the theme compatibility using Gscan, run the following command:

```bash
# test with gscan
npm run test
```

### Create ZIP file
The `zip` Gulp task packages the theme files into `dist/<theme-name>.zip`, which you can then upload to your site.

```bash
# create .zip file
npm run zip
```

&nbsp;

## Copyright & License
Copyright (c) Spiritix (spiritix.co)

For the full license text, please read the [LICENSE](LICENSE.md) file included with this project.
