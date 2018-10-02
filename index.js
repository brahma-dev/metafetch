var _ = require('lodash'),
	cheerio = require('cheerio'),
	charset = require('superagent-charset'),
	rest = require('superagent'),
	URI = require('uri-js'),
	franc = require('franc'),
	langs = require('langs'),
	Client = {};

charset(rest);

var parseMeta = function(url, options, body, header) {
	header = header || {};
	var uri = URI.parse(url);
	var $;
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
	var response = {};
	var title;
	if (options.title) {
		title = $('title').text();
	}
	if (options.charset) {
		response.charset = $("meta[charset]").attr("charset");
	}

	if (options.images) {
		var imagehash = {};
		response.images = $('img').map(function() {
			var src = $(this).attr('src');
			if (src) {
				return URI.resolve(url, src);
			} else {
				return "";
			}
		}).filter(function(e, f) {
			return (f.match(/\.(jpeg|jpg|gif|png|JPEG|JPG|GIF|PNG)$/) !== null);
		}).filter(function(i, item) {
			return imagehash.hasOwnProperty(item) ? false : (imagehash[item] = true);
		}).get();
	}
	if (options.links) {
		var linkhash = {};
		response.links = $('a').map(function() {
			var href = $(this).attr('href');
			if (href && href.trim().length && href[0] !== "#") {
				return URI.resolve(url, href);
			} else {
				return 0;
			}
		}).filter(function(i, item) {
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
	Object.keys(meta).forEach(function(key) {
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
Client.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:58.0) Gecko/20100101 Firefox/58.0";
Client.setUserAgent = function(agent) {
	if (typeof agent == "string") {
		Client.userAgent = agent;
	} else {
		throw "METAFETCH: Invalid User agent string supplied";
	}
};
Client.fetch = function(url, options, callback) {
	return new Promise(function(resolve, reject) {

		url = url.split("#")[0]; //Remove any anchor fragments
		var http_options = {
			timeout: 20000,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
			},
			followRedirects: false
		};
		var userAgent = Client.userAgent;
		var _options = {
			title: true,
			description: true,
			type: true,
			url: true,
			siteName: true,
			charset: true,
			image: true,
			meta: true,
			images: true,
			links: true,
			headers: true,
			language: true
		};
		if (typeof options === 'function') {
			callback = options;
		} else if (typeof options === 'object') {
			_.merge(http_options, options.http || {});
			_.merge(_options, options.flags || {});
			userAgent = options.userAgent || userAgent;
		}
		var cb = function(err, res) {
			if (typeof callback !== "undefined") {
				return callback(err, res);
			} else if (err) {
				return reject(err);
			}
			return resolve(res);
		};
		if (typeof url != "string" || url === "") {
			return cb("Invalid URL", (url || ""));
		}
		http_options.headers['User-Agent'] = userAgent;
		var redirectCount = 0;
		if (url.slice(-4) === ".pdf") {
			var pdf = function() {
				//TODO : PDF parsing
				rest.get(url).set(http_options.headers).timeout(http_options.timeout).end(function(err, response) {
					if (err && err.timeout) {
						return cb("Timeout");
					}
					if (!!!response) {
						return cb(err);
					}
					if (response.statusType === 2) {
						var meta = parseMeta(url, _options, "Metafetch does not support parsing PDF Content.");
						return cb(null, meta);
					} else {
						return cb(err.status);
					}
				});
			};
			pdf();
		} else {
			rest.get(url).set(http_options.headers).timeout(http_options.timeout).end(function(err, response) {
				if (err && err.timeout) {
					return cb("Timeout");
				}
				if (!!!response) {
					return cb(err);
				}
				if (response.statusType === 2) {
					var meta = parseMeta(response.request.url, _options, response.text, response.header);
					if (typeof meta == "string") {
						return cb(meta);
					}
					return cb(null, meta);
				} else {
					return cb(err.status);
				}
			});
		}
	});
};

module.exports = Client;
