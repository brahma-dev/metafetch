//@ts-nocheck

import cheerio from "cheerio";
const URI =require("uri-js");
import franc from "franc";
import langs from "langs";
export default function (url, options, body, header?) {
	header = header || {};
	var uri = URI.parse(url);
	var $: any;
	try {
		$ = cheerio.load(body);
	} catch (e) {
		return "Invalid HTML";
	}
	$('script').remove();
	$('style').remove();
	$('applet').remove();
	$('embed').remove();
	$('object').remove();
	$('noscript').remove();
	var response: any = {};
	var title;
	if (options.title) {
		title = $('title').text();
	}
	if (options.charset) {
		response.charset = $("meta[charset]").attr("charset");
	}

	if (options.images) {
		var imagehash = {};
		response.images = $('img').map(function () {
			var src = $(this).attr('src');
			if (src) {
				return URI.resolve(url, src);
			} else {
				return "";
			}
		}).filter(function (e, f) {
			return (f.match(/\.(jpeg|jpg|gif|png|JPEG|JPG|GIF|PNG)$/) !== null);
		}).filter(function (i, item) {
			return imagehash.hasOwnProperty(item) ? false : (imagehash[item] = true);
		}).get();
	}
	if (options.links) {
		var linkhash = {};
		response.links = $('a').map(function () {
			var href = $(this).attr('href');
			if (href && href.trim().length && href[0] !== "#") {
				return URI.resolve(url, href);
			} else {
				return 0;
			}
		}).filter(function (i, item) {
			if (item === 0) {
				return false;
			}
			return linkhash.hasOwnProperty(item) ? false : (linkhash[item] = true);
		}).get();
	}
	var meta = $('meta'),
		canonicalURL = $("link[rel=canonical]").attr('href'),
		ampURL = $("link[rel=amphtml]").attr('href'),
		metaData = {};
	if (ampURL) {
		ampURL = URI.resolve(url, ampURL);
	}
	Object.keys(meta).forEach(function (key) {
		var attribs = meta[key].attribs;
		if (attribs) {
			if (attribs.property) {
				metaData[attribs.property.toLowerCase()] = attribs.content;
			}
			if (attribs.name) {
				metaData[attribs.name.toLowerCase()] = attribs.content;
			}
			if (attribs['http-equiv']) {
				header[attribs['http-equiv']] = attribs.content;
			}
		}
	});

	if (options.language) {
		response.language = $("html").attr("lang") || $("html").attr("xml:lang") || header["Content-Language"] || header["content-language"];
		if (!!!response.language) {
			response.language = langs.where("2", franc($('body').text().replace(/\n\s*\n/g, '\n')))
			response.language = response.language && response.language[1];
		} else {
			response.language = response.language.split("-")[0];
		}
	}

	response.uri = uri;

	if (options.title) {
		response.title = metaData['og:title'] || title;
	}
	if (options.description) {
		response.description = metaData['og:description'] || metaData.description;
	}
	if (options.type) {
		response.type = metaData['og:type'];
	}
	if (options.url) {
		response.url = URI.resolve(url, canonicalURL || metaData['og:url'] || url);
		response.originalURL = url;
		response.ampURL = ampURL || null;
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
		response.headers = header;
	}
	return response;
};
