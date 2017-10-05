var _ = require('lodash'),
	cheerio = require('cheerio'),
	charset = require('superagent-charset'),
	rest = require('superagent'),
	URI = require('uri-js'),
	Client = {};

charset(rest);

var parseMeta = function (url, options, body, header) {
	var uri = URI.parse(url);
	var $ = cheerio.load(body);
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

	Object.keys(meta).forEach(function (key) {
		var attribs = meta[key].attribs;
		if (attribs) {
			if (attribs.property) {
				metaData[attribs.property.toLowerCase()] = attribs.content;
			}
			if (attribs.name) {
				metaData[attribs.name.toLowerCase()] = attribs.content;
			}
		}
	});
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
		response.url = canonicalURL || metaData['og:url'] || url;
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
		response.headers = header || {};
	}
	return response;
};

Client.fetch = function (url, options, callback) {
	url = url.split("#")[0]; //Remove any anchor fragments
	var random_ua = require('modern-random-ua');
	var http_options = {
		timeout: 20000,
		headers: {
			'Accept': '*/*',
			'User-Agent': random_ua.generate()
		},
		followRedirects: false
	};
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
		headers: true
	};
	if (typeof options === 'function') {
		callback = options;
	} else if (typeof options === 'object') {
		_.merge(http_options, options.http || {});
		_.merge(_options, options.flags || {});
	}
	if (url === undefined || url === "") {
		if (callback !== undefined) {
			callback("Invalid URL", (url || ""));
		}
		return;
	}
	var redirectCount = 0;
	if (url.slice(-4) === ".pdf") {
		var pdf = function () {
			//TODO : PDF parsing
			rest.head(url).set(http_options.headers).timeout(http_options.timeout).end(function (err, response) {
				if (err && err.timeout) {
					return callback("Timeout");
				}
				if (!!!response) {
					return callback(err);
				}
				if (response.statusType === 3) {
					redirectCount++;
					if (redirectCount > 5) {
						return callback("Too many redirects");
					}
					url = URI.resolve(url, response.headers.location);
					return pdf();
				} else if (response.statusType === 2) {
					rest.get(url).set(http_options.headers).timeout(http_options.timeout).end(function (err, res) {
						if (err) {
							return callback(err);
						}
						var meta = parseMeta(url, _options, "Metafetch does not support parsing PDF Content.");
						return callback(null, meta);
					});
				} else {
					return callback(err.status);
				}
			});
		};
		pdf();
	} else {
		var text = function () {
			rest.head(url).set(http_options.headers).timeout(http_options.timeout).end(function (err, response) {
				if (err && err.timeout) {
					return callback("Timeout");
				}
				if (!!!response) {
					return callback(err);
				}
				if (response.statusType === 3) {
					redirectCount++;
					if (redirectCount > 5) {
						return callback("Too many redirects");
					}
					url = URI.resolve(url, response.headers.location);
					return text();
				} else if (response.statusType === 2) {
					rest.get(url).set(http_options.headers).timeout(http_options.timeout).end(function (err, res) {
						if (err) {
							return callback(err);
						}
						var meta = parseMeta(url, _options, res.text, res.header);
						return callback(null, meta);
					});
				} else {
					return callback(err.status);
				}
			});
		};
		text();
	}
};

module.exports = Client;
