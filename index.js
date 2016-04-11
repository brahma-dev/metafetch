var _ = require('lodash'),
	cheerio = require('cheerio'),
	rest = require('restler'),
	URI = require('uri-js'),
	Client = {};

var parseMeta = function(url, options, body) {
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
		response.images = $('img').map(function() {
			var src = $(this).attr('src');
			if (src) {
				return URI.resolve(url, src);
			} else {
				return "";
			}
		}).filter(function(e, f) {
			return (f.match(/\.(jpeg|jpg|gif|png|JPEG|JPG|GIF|PNG)$/) !== null);
		}).filter(function(item) {
			return imagehash.hasOwnProperty(item) ? false : (imagehash[item] = true);
		});
	}
	if (options.links) {
		var linkhash = {};
		response.links = $('a').map(function() {
			var href = $(this).attr('href');
			if (href && href.length && href[0] !== "#") {
				return URI.resolve(url, href);
			} else {
				return -1;
			}
		}).filter(function(item) {
			if (item === -1) {
				return false;
			}
			return linkhash.hasOwnProperty(item) ? false : (linkhash[item] = true);
		});
	}
	var meta = $('meta'),
		metaData = {};

	Object.keys(meta).forEach(function(key) {
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
		response.url = metaData['og:url'] || url;
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
	return response;
};

Client.fetch = function(url, options, callback) {
	if (url === undefined || url === "") {
		if (callback !== undefined) {
			callback("Invalid URL", (url || ""));
		}
		return;
	}
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
		links: true
	};
	if (typeof options === 'function') {
		callback = options;
	} else if (typeof options === 'object') {
		_.merge(http_options, options.http || {});
		_.merge(_options, options.flags || {});
	}
	var redirectCount = 0;
	if (url.slice(-4) === ".pdf") {
		var pdf = function() {
			rest.head(url, http_options).on('complete', function(result, response) {
				if (result instanceof Error) {
					callback(result);
				} else {
					if (response.statusCode === 200) {
						var meta = parseMeta(url, _options, result);
						callback(null, meta);
					} else {
						callback(response.statusCode);
					}
				}
			}).on('3XX', function(data, res) {
				redirectCount++;
				if (redirectCount > 5) {
					return callback("Too many redirects");
				}
				url = res.headers.location;
				return pdf();
			}).on('timeout', function() {
				callback('Timeout');
			});
		};
		pdf();
	} else {
		var text = function() {
			rest.get(url, http_options).on('complete', function(result, response) {
				if (result instanceof Error) {
					callback(result);
				} else {
					if (response.statusCode === 200) {
						var meta = parseMeta(url, _options, result);
						callback(null, meta);
					} else {
						callback(response.statusCode);
					}
				}
			}).on('3XX', function(data, res) {
				redirectCount++;
				if (redirectCount > 5) {
					return callback("Too many redirects");
				}
				url = res.headers.location;
				return text();
			}).on('timeout', function() {
				callback('Timeout');
			});
		};
		text();
	}
};

module.exports = Client;
