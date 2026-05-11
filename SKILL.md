# Metafetch Skills for AI Agents

Metafetch is a powerful, high-performance library and CLI tool for extracting metadata, Open Graph data, JSON-LD, and more from any web page. It supports client-side rendering (SPAs) and performance optimizations like head-only fetching.

## Capabilities
- **Metadata Extraction:** Title, description, site name, images, favicons, feeds, videos, audio.
- **Structured Data:** Parsed JSON-LD (filtered or full), Microdata, RDFa, and Web App Manifests.
- **SPA Support:** Renders JavaScript-heavy sites using Puppeteer.
- **Performance:** `headOnly` mode to stop downloading after the `</head>` tag (massive bandwidth/time savings).
- **Robustness:** Automatic retries with exponential backoff.

## Installation

```bash
npm install metafetch
# Optional: Install puppeteer for SPA rendering support
npm install puppeteer
```

## CLI Usage (Recommended for Agents)

Agents should prefer the CLI for quick information gathering.

### Basic Fetch
```bash
npx metafetch https://example.com
```

### Performance Optimized (Fastest)
If you only need basic meta tags and want to save time/bandwidth:
```bash
npx metafetch https://example.com --head-only --pretty
```

### SPA / Client-Side Rendering
If the page is empty or missing metadata (React/Vue/etc.):
```bash
npx metafetch https://example.com --render
```

### Filtering Structured Data
To extract only specific JSON-LD types (e.g., Products or Recipes):
```bash
npx metafetch https://example.com --jsonld-types Product,Recipe
```

### Key-Value Output (Easy to parse)
```bash
npx metafetch https://example.com --format kv
```

## API Usage (For Code Generation)

When writing scripts that use `metafetch`, use this pattern:

```javascript
import metafetch from 'metafetch';

async function getMetadata(url) {
  const meta = await metafetch.fetch(url, {
    // Optimization: Only fetch what you need
    flags: {
      links: false,
      images: false,
      microdata: false
    },
    headOnly: true, // Optional: Stop after </head>
    retries: 2      // Optional: Handle transient failures
  });
  return meta;
}
```

## Best Practices for AI Agents

1.  **Default to `headOnly`:** Unless you need images from the body or full link lists, use `--head-only`. It is significantly faster and uses less context.
2.  **Check for SPAs:** If the first fetch returns an empty description or generic title, retry with `--render`.
3.  **Use Flags:** In code, disable unnecessary flags (e.g., `links: false`) to reduce the size of the returned object and keep the agent's context window lean.
4.  **Verify Puppeteer:** If `--render` fails, ensure `puppeteer` is installed in the environment.
