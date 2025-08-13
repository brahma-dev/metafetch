import { parseHTML } from 'linkedom';
import type { Document } from 'linkedom';

/**
 * The shape of the response object returned by Metafetch.
 */
export interface MetafetchResponse {
	title?: string;
	description?: string;
	type?: string;
	url?: string;
	originalURL?: string;
	ampURL?: string;
	siteName?: string;
	charset?: string;
	image?: string;
	meta?: Record<string, string>;
	images?: string[];
	links?: string[];
	headers?: Record<string, string>;
	language?: string;
	favicon?: string;
	feeds?: string[];
}

type FlagOptions = {
	title?: boolean;
	description?: boolean;
	type?: boolean;
	url?: boolean;
	siteName?: boolean;
	charset?: boolean;
	image?: boolean;
	meta?: boolean;
	images?: boolean;
	links?: boolean;
	headers?: boolean;
	language?: boolean;
	favicon?: boolean;
	feeds?: boolean;
};

type ResolvedFlags = Required<FlagOptions>;

/**
 * Configuration options for a metafetch request.
 */
export interface FetchOptions {
	userAgent?: string;
	fetch?: RequestInit;
	flags?: FlagOptions;
	render?: boolean;
	retries?: number;
	retryDelay?: number;
}

export class Metafetch {
	#userAgent: string;

	constructor(ua: string = "Mozilla/5.0 (X11; Linux i686; rv:141.0) Gecko/20100101 Firefox/141.0") {
		this.#userAgent = ua;
	}

	/**
	 * Updates the default User-Agent for this instance.
	 * @param agent The new User-Agent string.
	 */
	public setUserAgent(agent: string): void {
		if (typeof agent !== "string" || agent.trim() === "") {
			throw new Error("Invalid User Agent: Must be a non-empty string.");
		}
		this.#userAgent = agent;
	}

	/**
	 * Gets the current default User-Agent for this instance.
	 */
	public get userAgent(): string {
		return this.#userAgent;
	}

	/**
	 * Wrapper for dynamic import of puppeteer to improve testability.
	 * @private
	 */
	private async _getPuppeteer() {
		return import('puppeteer');
	}

	/**
	 * Fetches and parses metadata from a given URL.
	 * @param url The URL to fetch.
	 * @param options Configuration for the fetch request.
	 * @returns A promise that resolves to a MetafetchResponse object.
	 */
	public async fetch(url: string, options: FetchOptions = {}): Promise<MetafetchResponse> {
		if (typeof url !== "string" || !url) {
			throw new Error("Invalid URL: URL must be a non-empty string.");
		}

		const retries = options.retries ?? 0;
		const retryDelay = options.retryDelay ?? 1000;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const cleanUrl = url.split("#")[0];

				const flags: ResolvedFlags = {
					title: true, description: true, type: true, url: true,
					siteName: true, charset: true, image: true, meta: true,
					images: true, links: true, headers: true, language: true,
					favicon: true, feeds: true,
					...(options.flags || {}),
				};

				let html: string;
				let finalUrl: string;
				let responseHeaders: Record<string, string> = {};
				let encoding: string;

				if (options.render) {
					let puppeteer;
					try {
						const puppeteerModule = await this._getPuppeteer();
						puppeteer = puppeteerModule.default;
					} catch (err) {
						throw new Error(
							'The "render" option requires the "puppeteer" package. Please install it (`npm install puppeteer`) and try again.'
						);
					}
					const browser = await puppeteer.launch({
						headless: true, args: [
							'--no-sandbox',
							'--disable-setuid-sandbox',
							'--disable-dev-shm-usage'
						]
					});
					const page = await browser.newPage();
					try {
						await page.setUserAgent(options.userAgent || this.#userAgent);
						const response = await page.goto(cleanUrl, { waitUntil: 'networkidle0' });

						if (!response) {
							throw new Error("Puppeteer navigation failed to return a response.");
						}
						if (!response.ok()) {
							throw new Error(`Request failed with status: ${response.status()} ${response.statusText()}`);
						}

						const puppeteerBuffer = await response.buffer();
						if (puppeteerBuffer.byteLength === 0) {
							throw new Error("Received an empty response body.");
						}

						const arrayBuffer = new Uint8Array(puppeteerBuffer).buffer;

						responseHeaders = response.headers();
						finalUrl = page.url();
						encoding = this._detectCharset(responseHeaders['content-type'], arrayBuffer);
						html = await page.content();

					} finally {
						await browser.close();
					}
				} else {
					const requestOptions: RequestInit = {
						method: 'GET',
						redirect: 'follow',
						...options.fetch,
						headers: {
							'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
							'User-Agent': options.userAgent || this.#userAgent,
							...options.fetch?.headers,
						},
					};
					const response = await fetch(cleanUrl, requestOptions);

					if (!response.ok) {
						throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
					}

					const buffer = await response.arrayBuffer();
					if (buffer.byteLength === 0) {
						throw new Error("Received an empty response body.");
					}
					finalUrl = response.url;
					response.headers.forEach((value, key) => { responseHeaders[key] = value; });

					encoding = this._detectCharset(responseHeaders['content-type'], buffer);
					html = new TextDecoder(encoding).decode(buffer);
				}

				const { document } = parseHTML(html);
				const result: MetafetchResponse = { originalURL: cleanUrl };

				if (flags.charset) {
					result.charset = encoding;
				}

				this._extractMeta(document, result, flags);
				this._extractStructuredData(document, result, flags);
				this._extractUrls(document, { url: finalUrl }, result, flags);
				this._extractAssets(document, result, flags);
				this._extractFavicon(document, result, flags);
				this._extractFeeds(document, result, flags);

				if (flags.headers) {
					result.headers = responseHeaders;
				}

				if (flags.language) {
					const rawLang = document.documentElement?.lang || responseHeaders['content-language']?.split(',')[0].trim();
					if (rawLang) {
						result.language = rawLang.split('-')[0];
					}
				}

				return result;
			} catch (error) {
				if (attempt === retries) {
					throw error;
				}

				// Wait using exponential backoff with jitter before retrying.
				const delay = (retryDelay * (2 ** attempt)) + Math.random() * 250;
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		throw new Error("Metafetch failed after all retry attempts.");
	}

	/**
	 * Detects character encoding from a buffer with a specific priority order:
	 * 1. Byte Order Mark (BOM)
	 * 2. Content-Type HTTP header
	 * 3. XML encoding declaration
	 * 4. HTML meta tag
	 * 5. Defaults to utf-8
	 */
	private _detectCharset(contentTypeHeader: string | null, buffer: ArrayBuffer): string {
		const view = new Uint8Array(buffer);

		if (view.length >= 3 && view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF) {
			return 'utf-8';
		}
		if (view.length >= 2 && view[0] === 0xFE && view[1] === 0xFF) {
			return 'utf-16be';
		}
		if (view.length >= 2 && view[0] === 0xFF && view[1] === 0xFE) {
			return 'utf-16le';
		}

		if (contentTypeHeader) {
			const match = contentTypeHeader.match(/charset="?([^"]+)"?/i);
			if (match && match[1]) return match[1].toLowerCase();
		}

		const readLength = Math.min(buffer.byteLength, 1024);
		const bufferAsString = new TextDecoder('latin1').decode(new Uint8Array(buffer, 0, readLength));

		const xmlMatch = bufferAsString.match(/<\?xml[^>]+encoding=["']([^"']+)["']/i);
		if (xmlMatch && xmlMatch[1]) return xmlMatch[1].toLowerCase();

		const metaMatch = bufferAsString.match(/<meta.+?charset=["']?([^"']+)/i);
		if (metaMatch && metaMatch[1]) return metaMatch[1].toLowerCase();

		return 'utf-8';
	}

	private _extractMeta(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (flags.title) {
			const titleEl = doc.querySelector('title');
			result.title = titleEl?.textContent?.trim() || '';
		}

		const metaTags: Record<string, string> = {};
		doc.querySelectorAll('meta').forEach(el => {
			const property = el.getAttribute('property') || el.getAttribute('name');
			const content = el.getAttribute('content');
			if (property && content) metaTags[property.toLowerCase()] = content;
		});

		if (flags.meta) result.meta = metaTags;
		if (flags.description) result.description = metaTags['og:description'] || metaTags['description'];
		if (flags.type) result.type = metaTags['og:type'];
		if (flags.siteName) result.siteName = metaTags['og:site_name'];
		if (flags.image) result.image = metaTags['og:image'] || metaTags['twitter:image'];
	}

	private _extractUrls(doc: Document, response: { url: string }, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.url) return;

		const baseEl = doc.querySelector('base');
		const base = baseEl ? baseEl.getAttribute('href') : null;

		const canonicalEl = doc.querySelector<HTMLLinkElement>("link[rel=canonical]");
		const canonicalUrl = canonicalEl ? canonicalEl.href : null;

		const ogUrl = result.meta ? result.meta['og:url'] : null;

		result.url = new URL(canonicalUrl || ogUrl || response.url, base || response.url).href;

		const ampUrlEl = doc.querySelector<HTMLLinkElement>("link[rel=amphtml]");
		if (ampUrlEl) {
			result.ampURL = new URL(ampUrlEl.href, result.url).href;
		}
	}

	private _extractAssets(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		const baseEl = doc.querySelector('base');
		const baseHref = baseEl ? baseEl.getAttribute('href') : null;
		const baseUrl = baseHref || result.url || result.originalURL!;

		if (flags.images) {
			const imageSources = new Set<string>();
			doc.querySelectorAll('img').forEach(el => {
				const src = el.getAttribute('src');
				if (src) {
					const trimmedSrc = src.trim();
					if (trimmedSrc !== '' && !trimmedSrc.startsWith('javascript:')) {
						try { imageSources.add(new URL(trimmedSrc, baseUrl).href) } catch { };
					}
				}
			});
			result.images = [...imageSources];
		}

		if (flags.links) {
			const linkHrefs = new Set<string>();
			doc.querySelectorAll('a').forEach(el => {
				const href = el.getAttribute('href');
				if (href) {
					const trimmedHref = href.trim();
					if (trimmedHref !== '' && !trimmedHref.startsWith('#') && !trimmedHref.startsWith('javascript:')) {
						try { linkHrefs.add(new URL(trimmedHref, baseUrl).href) } catch { };
					}
				}
			});
			result.links = [...linkHrefs];
		}
	}

	/**
	 * Recursively flattens a JSON-LD object or array into a single-level
	 * object with colon-delimited keys.
	 */
	private _flattenJsonLd(value: any, prefix: string, meta: Record<string, string>): void {
		if (value === null || value === undefined) {
			return;
		}

		if (typeof value === 'object' && !Array.isArray(value)) {
			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) {
					this._flattenJsonLd(value[key], `${prefix}:${key}`, meta);
				}
			}
		}
		else if (Array.isArray(value)) {
			value.forEach((item, index) => {
				this._flattenJsonLd(item, `${prefix}:${index}`, meta);
			});
		}
		else {
			meta[prefix] = value.toString();
		}
	}

	private _extractStructuredData(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.meta) return;

		doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
			try {
				const json = JSON.parse(script.textContent);

				if (typeof json === 'object' && json !== null) {
					this._flattenJsonLd(json, 'ld', result.meta!);
				}

			} catch (e) {
				console.warn('Error parsing JSON-LD:', e);
			}
		});
	}

	/**
	 * Finds the best favicon by prioritizing `apple-touch-icon` and then
	 * selecting the largest available size. Falls back to /favicon.ico.
	 */
	private _extractFavicon(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.favicon) return;

		const baseUrl = result.url || result.originalURL!;
		let bestIcon: { href: string, size: number } = { href: '', size: 0 };

		doc.querySelectorAll<HTMLLinkElement>("link[rel*='icon']").forEach(el => {
			const href = el.getAttribute('href');
			if (!href || href.trim() === '' || href.startsWith('data:')) return;

			const rel = el.getAttribute('rel')!;
			const sizes = el.getAttribute('sizes');
			let size = 0;
			if (sizes) {
				const match = sizes.match(/(\d+)x\d+/i);
				if (match) size = parseInt(match[1], 10);
			}

			let isBetter = false;
			if (!bestIcon.href) {
				isBetter = true;
			} else {
				const isNewApple = rel.includes('apple-touch-icon');
				const isBestApple = bestIcon.href.includes('apple-touch-icon');

				if (isNewApple && !isBestApple) {
					isBetter = true;
				}
				else if (isNewApple === isBestApple) {
					if (size > bestIcon.size) {
						isBetter = true;
					}
				}
			}

			if (isBetter) {
				bestIcon = { href, size };
			}
		});

		if (bestIcon.href) {
			result.favicon = new URL(bestIcon.href, baseUrl).href;
		} else {
			result.favicon = new URL('/favicon.ico', baseUrl).href;
		}
	}

	private _extractFeeds(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.feeds) return;

		const baseUrl = result.url || result.originalURL!;
		const feeds = new Set<string>();

		doc.querySelectorAll<HTMLLinkElement>("link[type*='rss'], link[type*='atom']").forEach(el => {
			const href = el.getAttribute('href');
			if (href && href.trim() !== '') {
				feeds.add(new URL(href, baseUrl).href);
			}
		});

		if (feeds.size > 0) {
			result.feeds = [...feeds];
		}
	}
}

export const metafetch = new Metafetch();
export default metafetch;
