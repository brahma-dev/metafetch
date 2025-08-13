# Node metafetch

[![Build Status](https://github.com/brahma-dev/metafetch/actions/workflows/build.yml/badge.svg)](https://github.com/brahma-dev/metafetch/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/brahma-dev/metafetch/branch/master/graph/badge.svg)](https://codecov.io/gh/brahma-dev/metafetch)
[![coveralls](https://coveralls.io/repos/github/brahma-dev/metafetch/badge.svg?branch=main)](https://coveralls.io/github/brahma-dev/metafetch?branch=main)
[![Known Vulnerabilities](https://snyk.io/test/npm/metafetch/badge.svg?style=flat)](https://snyk.io/test/npm/metafetch)
[![NPM version](https://img.shields.io/npm/v/metafetch.svg?style=flat)](https://www.npmjs.org/package/metafetch)

**Metafetch** is a library to fetch and parse metadata from a web page. It can extract standard meta tags, Open Graph data, JSON-LD, favicons, and feeds, and even render client-side JavaScript to get data from Single-Page Applications (SPAs).

## Key Features

*   **Comprehensive Metadata:** Extracts title, description, URL, site name, images, links, and more.
*   **Client-Side Rendering:** Uses **Puppeteer** to render JavaScript-heavy sites, ensuring you get the metadata even from SPAs (e.g., React, Vue, Svelte).
*   **Robust Network Handling:** Features built-in **request retries with exponential backoff** to handle transient network errors gracefully.
*   **Rich Content Discovery:**
    *   Finds the best-quality **favicon** by prioritizing Apple touch icons and largest sizes.
    *   Discovers **RSS/Atom feeds** linked in the page.
    *   Parses and flattens structured **JSON-LD** data.
*   **Advanced Encoding Detection:** Accurately detects character encoding via BOM, HTTP headers, and meta tags to prevent garbled text.
*   **Highly Configurable:** Fine-tune requests with custom headers, user agents, and feature flags to parse only what you need.

## Installation

Use NPM to install:

```bash
npm install metafetch puppeteer
```
*Note: `puppeteer` is a peer dependency and must be installed separately if you want to use the client-side rendering feature.*

## Usage

### Basic Example

Here's a simple example using `async/await`.

```javascript
import metafetch from 'metafetch';

async function getMeta(url) {
  try {
    const meta = await metafetch.fetch(url);
    console.log(meta);
  } catch (err) {
    console.error(err);
  }
}

getMeta('https://example.com');
```

This will output a representative object like this:

```js
{
  title: 'Awesome Web Page',
  description: 'A compelling description of the page content, often used by search engines.',
  type: 'article',
  url: 'https://example.com/article-path',
  originalURL: 'https://example.com',
  siteName: 'Example News',
  charset: 'utf-8',
  image: 'https://example.com/images/featured-image.png',
  favicon: 'https://example.com/favicons/apple-touch-icon.png',
  feeds: [ 'https://example.com/rss.xml' ],
  meta: {
     'og:title': 'Awesome Web Page',
     'og:description': 'A compelling description...',
     'ld:headline': 'Awesome Web Page',
     /* ... other meta and JSON-LD tags ... */
  },
  images: [ 'https://example.com/images/featured-image.png', /* ... */ ],
  links: [ 'https://example.com/another-page', /* ... */ ],
  headers: { 'content-type': 'text/html; charset=utf-8', /* ... */ },
  language: 'en'
}
```

### Advanced Example (Rendering SPAs & Retries)

To get metadata from a client-rendered page or to make your request more robust, use the advanced options.

```javascript
import metafetch from 'metafetch';

async function getSpaMeta(url) {
  try {
    const meta = await metafetch.fetch(url, {
      // Use puppeteer to render the page
      render: true,

      // Retry up to 2 times on failure
      retries: 2,
      retryDelay: 1000, // 1 second base delay

      // Disable parsing of things you don't need
      flags: {
        images: false,
        links: false
      },
      
      // Pass custom options to the underlying fetch call
      fetch: {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    });

    console.log('Title:', meta.title);
    console.log('Description:', meta.description);

  } catch (err) {
    console.error(err);
  }
}

getSpaMeta('https://my-single-page-app.com');
```

## API

### `metafetch.fetch(url, [options])`

Fetches and parses metadata from the given `url`.

#### Options (`FetchOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `render` | `boolean` | `false` | If `true`, uses Puppeteer to render the page's JavaScript before parsing. |
| `retries` | `number` | `0` | Number of times to retry the request on failure. |
| `retryDelay` | `number` | `1000` | Base delay in milliseconds for retries (uses exponential backoff). |
| `userAgent`| `string` | Firefox | The User-Agent string to use for the request. |
| `flags` | `object` | `{...}` | An object to enable/disable parsing specific fields. All flags are `true` by default. See the list below for all available flags. |
| `fetch` | `object` | `{}` | `RequestInit` options passed directly to the `fetch` call (e.g., `{ headers: {...} }`). |

### Available Flags

You can pass any of these boolean flags in the `flags` object to optimize parsing. For example, `flags: { links: false, images: false }` will skip extracting links and images.

*   `title`
*   `description`
*   `type`
*   `url`
*   `siteName`
*   `charset`
*   `image`
*   `meta` (includes all meta tags and flattened JSON-LD)
*   `images`
*   `links`
*   `headers`
*   `language`
*   `favicon`
*   `feeds`

### Instance Management

You can create multiple instances of `Metafetch`, each with its own default User-Agent.

```javascript
import { Metafetch } from 'metafetch';

// Create an instance with a custom default User-Agent
const myBot = new Metafetch("MyPersonalBot/1.0");
await myBot.fetch('https://example.com');

// You can also change it later
myBot.setUserAgent("MyPersonalBot/2.0");
console.log(myBot.userAgent); // "MyPersonalBot/2.0"
```

## Response Data

| Field | Type | Description |
|---|---|---|
| `title` | `string` | The page's `<title>` tag. |
| `description` | `string` | The `og:description` or `description` meta tag. |
| `type` | `string` | The `og:type` meta tag (e.g., "website", "article"). |
| `url` | `string` | The final URL after redirects. Prioritizes `canonical` or `og:url`. |
| `originalURL`| `string` | The URL that was originally passed to the fetch method. |
| `ampURL` | `string` | The URL from a `<link rel="amphtml">` tag, if present. |
| `siteName` | `string` | The `og:site_name` meta tag. |
| `charset` | `string` | The detected character encoding of the page. |
| `image` | `string` | The `og:image` or `twitter:image` meta tag. |
| `favicon` | `string` | The best-quality favicon URL found on the page. |
| `feeds` | `string[]`| An array of RSS/Atom feed URLs discovered on the page. |
| `meta` | `object` | A key-value object of all meta tags and flattened JSON-LD data. |
| `images` | `string[]`| An array of all absolute image URLs on the page. |
| `links` | `string[]`| An array of all absolute hyperlink (`<a>`) URLs on the page. |
| `headers` | `object` | An object containing the final response's HTTP headers. |
| `language` | `string` | The content language (ISO 639-1) from the `<html>` tag or headers. |


## License

(The MIT License)

Copyright (c) 2025 Brahma Dev;

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
