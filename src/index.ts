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
	videos?: string[];
	audio?: string[];
	oEmbed?: string;
	jsonLd?: Record<string, any>[];
	microdata?: Record<string, any>[];
	rdfa?: Record<string, any>[];
	manifest?: Record<string, any>;
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
	videos?: boolean;
	audio?: boolean;
	oEmbed?: boolean;
	jsonLd?: boolean;
	microdata?: boolean;
	rdfa?: boolean;
	manifest?: boolean;
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
	headOnly?: boolean;
	jsonLdTypes?: string[];
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
					title: options.flags?.title ?? true,
					description: options.flags?.description ?? true,
					type: options.flags?.type ?? true,
					url: options.flags?.url ?? true,
					siteName: options.flags?.siteName ?? true,
					charset: options.flags?.charset ?? true,
					image: options.flags?.image ?? true,
					meta: options.flags?.meta ?? true,
					images: options.flags?.images ?? true,
					links: options.flags?.links ?? true,
					headers: options.flags?.headers ?? true,
					language: options.flags?.language ?? true,
					favicon: options.flags?.favicon ?? true,
					feeds: options.flags?.feeds ?? true,
					videos: options.flags?.videos ?? true,
					audio: options.flags?.audio ?? true,
					oEmbed: options.flags?.oEmbed ?? true,
					jsonLd: options.flags?.jsonLd ?? true,
					microdata: options.flags?.microdata ?? true,
					rdfa: options.flags?.rdfa ?? true,
					manifest: options.flags?.manifest ?? true,
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

					let buffer: ArrayBuffer;
					if (options.headOnly && response.body) {
						const reader = response.body.getReader();
						const chunks: Uint8Array[] = [];
						let totalLength = 0;
						let accumulatedText = '';
						const decoder = new TextDecoder();

						while (true) {
							const { done, value } = await reader.read();
							if (done) break;

							chunks.push(value);
							totalLength += value.length;
							accumulatedText += decoder.decode(value, { stream: true });

							if (accumulatedText.toLowerCase().includes('</head>')) {
								await reader.cancel();
								break;
							}
						}

						const fullBuffer = new Uint8Array(totalLength);
						let offset = 0;
						for (const chunk of chunks) {
							fullBuffer.set(chunk, offset);
							offset += chunk.length;
						}
						buffer = fullBuffer.buffer;
					} else {
						buffer = await response.arrayBuffer();
					}

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
				this._extractStructuredData(document, result, flags, options);
				this._extractUrls(document, { url: finalUrl }, result, flags);
				this._extractAssets(document, result, flags);
				this._extractMultimedia(document, result, flags);
				this._extractOEmbed(document, result, flags);
				this._extractFavicon(document, result, flags);
				this._extractFeeds(document, result, flags);
				this._extractMicrodata(document, result, flags);
				this._extractRdfa(document, result, flags);

				await this._extractManifest(document, result, flags, {
					userAgent: options.userAgent || this.#userAgent,
					headers: options.fetch?.headers as Record<string, string>
				});

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

		if (flags.meta && Object.keys(metaTags).length > 0) result.meta = metaTags;
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
		if (!flags.images && !flags.links) return;

		const baseEl = doc.querySelector('base');
		const baseHref = baseEl ? baseEl.getAttribute('href') : null;
		const baseUrl = baseHref || result.url || result.originalURL!;

		const imageSources = new Set<string>();
		const linkHrefs = new Set<string>();

		doc.querySelectorAll('img, a').forEach(el => {
			if (el.tagName.toLowerCase() === 'img' && flags.images) {
				const src = el.getAttribute('src');
				if (src) {
					const trimmedSrc = src.trim();
					if (trimmedSrc !== '' && !trimmedSrc.startsWith('javascript:')) {
						try { imageSources.add(new URL(trimmedSrc, baseUrl).href); } catch { }
					}
				}
			} else if (el.tagName.toLowerCase() === 'a' && flags.links) {
				const href = el.getAttribute('href');
				if (href) {
					const trimmedHref = href.trim();
					if (trimmedHref !== '' && !trimmedHref.startsWith('#') && !trimmedHref.startsWith('javascript:')) {
						try { linkHrefs.add(new URL(trimmedHref, baseUrl).href); } catch { }
					}
				}
			}
		});

		if (flags.images) result.images = [...imageSources];
		if (flags.links) result.links = [...linkHrefs];
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

	private _extractStructuredData(doc: Document, result: MetafetchResponse, flags: ResolvedFlags, options: FetchOptions = {}) {
		if (!flags.meta && !flags.jsonLd) return;

		doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
			const content = script.textContent;
			if (!content) return;

			// Optimization: Pre-screen for requested types if provided
			if (options.jsonLdTypes && options.jsonLdTypes.length > 0) {
				const hasType = options.jsonLdTypes.some(type => content.includes(`"${type}"`) || content.includes(`'${type}'`));
				if (!hasType) return;
			}

			try {
				let json = JSON.parse(content);
				if (typeof json !== 'object' || json === null) return;

				// Filter if requested
				if (options.jsonLdTypes && options.jsonLdTypes.length > 0) {
					if (Array.isArray(json)) {
						json = json.filter(item => {
							const type = item['@type'];
							if (Array.isArray(type)) return type.some(t => options.jsonLdTypes!.includes(t));
							return options.jsonLdTypes!.includes(type);
						});
						if (json.length === 0) return;
					} else {
						const type = json['@type'];
						const matches = Array.isArray(type)
							? type.some(t => options.jsonLdTypes!.includes(t))
							: options.jsonLdTypes!.includes(type);
						if (!matches) return;
					}
				}

				if (flags.jsonLd) {
					if (!result.jsonLd) result.jsonLd = [];
					if (Array.isArray(json)) {
						result.jsonLd.push(...json);
					} else {
						result.jsonLd.push(json);
					}
				}

				if (flags.meta) {
					if (!result.meta) result.meta = {};
					this._flattenJsonLd(json, 'ld', result.meta);
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

	private _extractMultimedia(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		const baseUrl = result.url || result.originalURL!;

		if (flags.videos) {
			const videos = new Set<string>();

			// From og:video
			if (result.meta && result.meta['og:video']) {
				videos.add(result.meta['og:video']);
			}

			// From <video> tags
			doc.querySelectorAll('video').forEach(el => {
				const src = el.getAttribute('src');
				if (src) {
					try { videos.add(new URL(src, baseUrl).href); } catch { }
				}
				el.querySelectorAll('source').forEach(source => {
					const sSrc = source.getAttribute('src');
					if (sSrc) {
						try { videos.add(new URL(sSrc, baseUrl).href); } catch { }
					}
				});
			});

			if (videos.size > 0) result.videos = [...videos];
		}

		if (flags.audio) {
			const audio = new Set<string>();

			// From og:audio
			if (result.meta && result.meta['og:audio']) {
				audio.add(result.meta['og:audio']);
			}

			// From <audio> tags
			doc.querySelectorAll('audio').forEach(el => {
				const src = el.getAttribute('src');
				if (src) {
					try { audio.add(new URL(src, baseUrl).href); } catch { }
				}
				el.querySelectorAll('source').forEach(source => {
					const sSrc = source.getAttribute('src');
					if (sSrc) {
						try { audio.add(new URL(sSrc, baseUrl).href); } catch { }
					}
				});
			});

			if (audio.size > 0) result.audio = [...audio];
		}
	}

	private _extractOEmbed(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.oEmbed) return;

		const baseUrl = result.url || result.originalURL!;
		const oEmbedLink = doc.querySelector<HTMLLinkElement>('link[type="application/json+oembed"]');

		if (oEmbedLink) {
			const href = oEmbedLink.getAttribute('href');
			if (href) {
				try { result.oEmbed = new URL(href, baseUrl).href; } catch { }
			}
		}
	}

	private _extractMicrodata(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.microdata) return;

		const items: Record<string, any>[] = [];
		const baseUrl = result.url || result.originalURL!;

		const getItemValue = (el: Element): any => {
			if (el.hasAttribute('itemscope')) {
				return parseItem(el);
			}

			const tagName = el.tagName.toLowerCase();
			if (tagName === 'meta') return el.getAttribute('content') || '';
			if (['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'].includes(tagName)) {
				const src = el.getAttribute('src');
				return src ? new URL(src, baseUrl).href : '';
			}
			if (['a', 'area', 'link'].includes(tagName)) {
				const href = el.getAttribute('href');
				return href ? new URL(href, baseUrl).href : '';
			}
			if (tagName === 'object') {
				const data = el.getAttribute('data');
				return data ? new URL(data, baseUrl).href : '';
			}
			if (tagName === 'data') return el.getAttribute('value') || '';
			if (tagName === 'meter') return el.getAttribute('value') || '';
			if (tagName === 'time') return el.getAttribute('datetime') || el.textContent?.trim() || '';

			return el.textContent?.trim() || '';
		};

		const parseItem = (root: Element): Record<string, any> => {
			const item: Record<string, any> = {};
			const type = root.getAttribute('itemtype');
			if (type) item['@type'] = type;
			const id = root.getAttribute('itemid');
			if (id) item['@id'] = id;

			const props = root.querySelectorAll('[itemprop]');
			props.forEach(prop => {
				// Ensure the property belongs to this itemscope and not a nested one
				let parent = prop.parentElement;
				let isDirect = true;
				while (parent && parent !== root) {
					if (parent.hasAttribute('itemscope')) {
						isDirect = false;
						break;
					}
					parent = parent.parentElement;
				}

				if (isDirect) {
					const name = prop.getAttribute('itemprop')!;
					const value = getItemValue(prop);

					if (item[name]) {
						if (!Array.isArray(item[name])) item[name] = [item[name]];
						item[name].push(value);
					} else {
						item[name] = value;
					}
				}
			});

			return item;
		};

		// Find top-level itemscopes (those that are not themselves an itemprop)
		doc.querySelectorAll('[itemscope]').forEach(el => {
			if (!el.hasAttribute('itemprop')) {
				items.push(parseItem(el));
			}
		});

		if (items.length > 0) result.microdata = items;
	}

	private _extractRdfa(doc: Document, result: MetafetchResponse, flags: ResolvedFlags) {
		if (!flags.rdfa) return;

		const items: Record<string, any>[] = [];
		const baseUrl = result.url || result.originalURL!;

		const getRdfaValue = (el: Element): any => {
			const typeofAttr = el.getAttribute('typeof');
			if (typeofAttr) {
				return parseEntity(el);
			}

			const content = el.getAttribute('content');
			if (content !== null) return content;

			const tagName = el.tagName.toLowerCase();
			if (['img', 'audio', 'video', 'source', 'track'].includes(tagName)) {
				const src = el.getAttribute('src');
				return src ? new URL(src, baseUrl).href : '';
			}
			if (['a', 'area', 'link'].includes(tagName)) {
				const href = el.getAttribute('href');
				return href ? new URL(href, baseUrl).href : '';
			}
			if (tagName === 'object') {
				const data = el.getAttribute('data');
				return data ? new URL(data, baseUrl).href : '';
			}
			if (tagName === 'time') return el.getAttribute('datetime') || el.textContent?.trim() || '';

			return el.textContent?.trim() || '';
		};

		const parseEntity = (root: Element): Record<string, any> => {
			const entity: Record<string, any> = {};
			const type = root.getAttribute('typeof');
			if (type) entity['@type'] = type;
			const about = root.getAttribute('about') || root.getAttribute('resource');
			if (about) entity['@id'] = about;
			const vocab = root.getAttribute('vocab');
			if (vocab) entity['@context'] = vocab;

			root.querySelectorAll('[property]').forEach(prop => {
				let parent = prop.parentElement;
				let isDirect = true;
				while (parent && parent !== root) {
					if (parent.hasAttribute('typeof') && !parent.hasAttribute('property')) {
						isDirect = false;
						break;
					}
					parent = parent.parentElement;
				}

				if (isDirect) {
					const name = prop.getAttribute('property')!;
					const value = getRdfaValue(prop);

					if (entity[name]) {
						if (!Array.isArray(entity[name])) entity[name] = [entity[name]];
						entity[name].push(value);
					} else {
						entity[name] = value;
					}
				}
			});

			return entity;
		};

		doc.querySelectorAll('[typeof]').forEach(el => {
			if (!el.hasAttribute('property')) {
				items.push(parseEntity(el));
			}
		});

		if (items.length > 0) result.rdfa = items;
	}

	private async _extractManifest(doc: Document, result: MetafetchResponse, flags: ResolvedFlags, options: { userAgent: string, headers?: Record<string, string> }) {
		if (!flags.manifest) return;

		const manifestLink = doc.querySelector<HTMLLinkElement>('link[rel="manifest"]');
		if (!manifestLink) return;

		const href = manifestLink.getAttribute('href');
		if (!href) return;

		const baseUrl = result.url || result.originalURL!;
		const manifestUrl = new URL(href, baseUrl).href;

		try {
			const response = await fetch(manifestUrl, {
				headers: {
					'User-Agent': options.userAgent,
					...options.headers
				}
			});

			if (response.ok) {
				const json = await response.json();
				result.manifest = json;
			}
		} catch (e) {
			// Silent fail for manifest fetching
		}
	}
}

export const metafetch = new Metafetch();
export default metafetch;
