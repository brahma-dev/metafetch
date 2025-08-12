import { parseHTML } from 'linkedom';
import type { Document } from 'linkedom';

// --- Type Definitions ---

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
};

type ResolvedFlags = Required<FlagOptions>;

export interface FetchOptions {
	userAgent?: string;
	fetch?: RequestInit;
	flags?: FlagOptions;
}

// --- The Core Class ---

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


	public async fetch(url: string, options: FetchOptions = {}): Promise<MetafetchResponse> {
		if (typeof url !== "string" || !url) {
			throw new Error("Invalid URL: URL must be a non-empty string.");
		}

		const cleanUrl = url.split("#")[0];

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

		const flags: ResolvedFlags = {
			title: true, description: true, type: true, url: true,
			siteName: true, charset: true, image: true, meta: true,
			images: true, links: true, headers: true, language: true,
			...(options.flags || {}),
		};

		try {
			const response = await fetch(cleanUrl, requestOptions);

			if (!response.ok) {
				throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
			}

			const buffer = await response.arrayBuffer();

			if (buffer.byteLength === 0) {
				throw new Error("Received an empty response body.");
			}
			const encoding = this._detectEncoding(response.headers.get('content-type'), buffer);
			const html = new TextDecoder(encoding).decode(buffer);
			const { document } = parseHTML(html);

			const result: MetafetchResponse = { originalURL: cleanUrl };
			if (flags.charset) {
				result.charset = encoding;
			}
			this._extractMeta(document, result, flags);
			this._extractUrls(document, response, result, flags);
			this._extractAssets(document, result, flags);

			if (flags.headers) {
				result.headers = {};
				response.headers.forEach((value, key) => { result.headers![key] = value; });
			}

			if (flags.language) {
				const rawLang = document.documentElement?.lang || response.headers.get('content-language')?.split(',')[0].trim();
				if (rawLang) {
					result.language = rawLang.split('-')[0];
				}
			}

			return result;
		} catch (error) {
			throw error;
		}
	}

	private _detectEncoding(contentTypeHeader: string | null, buffer: ArrayBuffer): string {
		if (contentTypeHeader) {
			const match = contentTypeHeader.match(/charset="?([^"]+)"?/i);
			if (match && match[1]) return match[1].toLowerCase();
		}

		const readLength = Math.min(buffer.byteLength, 1024);
		const bufferAsString = new TextDecoder('latin1').decode(new Uint8Array(buffer, 0, readLength));

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

	private _extractUrls(doc: Document, response: Response, result: MetafetchResponse, flags: ResolvedFlags) {
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
}

export const metafetch = new Metafetch();
export default metafetch;
