import cheerio, { CheerioAPI } from "cheerio";
import { URL } from 'url';
import langs, { Language } from "langs";
import { RawAxiosRequestHeaders } from "axios";
export interface MetafetchResponse {
	title?: string,
	charset?: string,
	images?: Array<string>,
	links?: Array<string>,
	language?: string | Language,
	description?: string,
	type?: string,
	url?: URL,
	originalURL?: string,
	ampURL?: string,
	siteName?: string,
	image?: string,
	meta?: { [x: string]: string },
	headers?: RawAxiosRequestHeaders,
}
export default function (url: string, options: any, body: string, headers: RawAxiosRequestHeaders, franc: ((value?: string | undefined) => string) | ((arg0: string) => string)): MetafetchResponse {
	if (!body.includes("html"))
		throw new Error("Invalid HTML");
	let $: CheerioAPI;
	$ = cheerio.load(body);
	$('script').remove();
	$('style').remove();
	$('applet').remove();
	$('embed').remove();
	$('object').remove();
	$('noscript').remove();
	let response: MetafetchResponse = {};
	let title;
	if (options.title) {
		title = $('title').text();
	}
	if (options.charset) {
		response.charset = $("meta[charset]").attr("charset") || (headers['content-type']?.toString().match(/charset=(.+)/) || []).pop();
	}
	if (options.images) {
		var imagehash: { [x: string]: boolean } = {};
		response.images = $('img').map(function () {
			let src: string | undefined = $(this).attr('src') || $(this).attr('data-src');
			if (src) {
				return (new URL(src, url)).href;
			} else {
				return "";
			}
		}).filter(function (e, f) {
			return (f.match(/\.(jpeg|jpg|gif|png|JPEG|JPG|GIF|PNG)$/) !== null);
		}).filter(function (i, item) {
			return imagehash.hasOwnProperty(item) ? false : (imagehash[item] = true);
		}).get();
		const imageCandidateRegex = /\s*([^,]\S*[^,](?:\s+[^,]+)?)\s*(?:,|$)/;
		$('img').map(function () {
			let src: string | undefined = $(this).attr('srcset') || $(this).attr('data-srcset');
			if (src) {
				return src.split(imageCandidateRegex)
					.filter((part, index) => index % 2 === 1)
					.forEach(part => {
						let [imgurl, ...descriptors] = part.trim().split(/\s+/);
						imgurl = (new URL(imgurl, url)).href;
						imagehash.hasOwnProperty(imgurl) ? false : ((imagehash[imgurl] = true) && response.images?.push(imgurl));
					});
			} else {
				return "";
			}
		});
	}
	if (options.links) {
		var linkhash: { [x: string]: boolean } = {};
		response.links = $('a').map(function () {
			let href: string | undefined = $(this).attr('href');
			if (href && href.trim().length && href[0] !== "#") {
				return (new URL(href, url)).href;
			} else {
				return "";
			}
		}).filter(function (i, item) {
			if (item === "") {
				return false;
			}
			return linkhash.hasOwnProperty(item) ? false : (linkhash[item] = true);
		}).get();
	}
	let meta = $('meta'),
		canonicalURL = $("link[rel=canonical]").attr('href'),
		ampURL = $("link[rel=amphtml]").attr('href'),
		metaData: { [x: string]: string } = {};
	if (ampURL) {
		ampURL = (new URL(ampURL, url)).href;
	}
	Object.keys(meta).forEach(function (key: string) {
		//@ts-ignore
		var attribs = meta[key].attribs;
		if (attribs) {
			if (attribs.property) {
				metaData[attribs.property.toLowerCase()] = attribs.content;
			}
			if (attribs.name) {
				metaData[attribs.name.toLowerCase()] = attribs.content;
			}
			if (attribs['http-equiv']) {
				headers[attribs['http-equiv']] = attribs.content;
			}
		}
	});
	if (options.language) {
		response.language = $("html").attr("lang") || $("html").attr("xml:lang") || headers["Content-Language"]?.toString() || headers["content-language"]?.toString();
		if (typeof response.language == "string") {
			response.language = response.language.split("-")[0];
		} else {
			response.language = langs.where("2", franc($('body').text().replace(/\n\s*\n/g, '\n')))
			response.language = response.language && response.language[1];
		}
	}

	// response.uri = uri;

	if (options.title) {
		response.title = title;
	}
	if (options.description) {
		response.description = metaData['og:description'] || metaData.description;
	}
	if (options.type) {
		response.type = metaData['og:type'];
	}
	if (options.url) {
		response.url = (new URL(canonicalURL || metaData['og:url'] || url, url));
		response.originalURL = url;
		response.ampURL = ampURL || undefined;
	}
	if (options.siteName) {
		response.siteName = metaData['og:site_name'];
	}
	if (options.image) {
		response.image = metaData['og:image'];
	}
	if (options.meta) {
		response.meta = metaData;
	}
	if (options.headers) {
		response.headers = headers;
	}
	return response;
}
