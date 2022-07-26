# Node [metafetch](https://www.npmjs.org/package/metafetch)
[![Build Status](https://github.com/brahma-dev/metafetch/actions/workflows/build.yml/badge.svg)](https://github.com/brahma-dev/metafetch/actions/workflows/build.yml)
[![Coverage](https://img.shields.io/codecov/c/github/brahma-dev/metafetch.svg?style=flat-square)](https://codecov.io/github/brahma-dev/metafetch?branch=master)
[![Coverage](https://img.shields.io/coveralls/brahma-dev/metafetch.svg?style=flat-square)](https://coveralls.io/github/brahma-dev/metafetch?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/npm/metafetch/badge.svg?style=flat-square)](https://snyk.io/test/npm/metafetch)

[![NPM](https://nodei.co/npm/metafetch.png?downloadRank=true&downloads=true)](https://nodei.co/npm/metafetch.png?downloadRank=true&downloads=true)

Metafetch fetches a given URL's title, description, images, links etc.

## Installation ##

Use NPM to install:

    npm install metafetch

## Usage

    import metafetch from 'metafetch';

    metafetch.fetch('http://www.facebook.com'[, options]).then(function(meta) {
        console.log('title: ', meta.title);
        console.log('description: ', meta.description);
        console.log('type: ', meta.type);
        console.log('url: ', meta.url);
        console.log('ampURL: ', meta.ampURL);
        console.log('siteName: ', meta.siteName);
        console.log('charset: ', meta.charset);
        console.log('image: ', meta.image);
        console.log('meta: ', meta.meta);
        console.log('images: ', meta.images);
        console.log('links: ', meta.links);
        console.log('headers: ', meta.headers);
        console.log('language: ', meta.language);
    }).catch(console.error);

#### Optional flags to disable parsing images and links and http timeout or headers

    metafetch.fetch('http://www.facebook.com', { 
        userAgent: "User Agent/Defaults to Firefox 58",
        flags: { 
            images: false,
            links: false,
            language: false
        },
        http: {
            timeout: 30000,
            headers: {
                Accept: "*/*"
            }
        }
    }).then(function(meta) {
        console.log('title: ', meta.title);
        console.log('description: ', meta.description);
        console.log('type: ', meta.type);
        console.log('url: ', meta.url);
        console.log('ampURL: ', meta.ampURL);
        console.log('siteName: ', meta.siteName);
        console.log('charset: ', meta.charset);
        console.log('image: ', meta.image);
        console.log('meta: ', meta.meta);
        console.log('headers: ', meta.headers);
        console.log('language: ', meta.language);
    }).catch(console.error);;

#### Set User Agent across instance

    metafetch.setUserAgent("PersonalBot");

### Response Data

* `title` : Page title or `og:title` meta tag.
* `description` : Page description or `og:description` meta tag.
* `image` : `og:image` meta tag.
* `url` : Page url or `og:url` meta tag.
* `ampURL` : URL from amphtml tag or null.
* `images` : All images on this page.
* `links` : All links on this page.
* `meta` : All the meta tags that with a `property` or `name` attribute. e.g `<meta property="author" content="Example">`, `<meta name="description" content="Example.">`
* `headers` : HTTP headers, lowercasing field names much like node does.
* `language` : Content language (ISO 639-1) based on meta data/headers, falling back to detection by [franc](https://www.npmjs.com/package/franc).

## License ##

(The MIT License)

Copyright (c) 2022 Brahma Dev;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
