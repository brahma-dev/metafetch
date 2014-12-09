var _ = require('lodash'),
    cheerio = require('cheerio'),
    rest = require('restler'),
    URI = require('uri-js'),
    Client = {};

var parseMeta = function (url, options, body) {
    var uri = URI.parse(url);
    var $ = cheerio.load(body);
    var response = {};
    if (options.title)
        var title = $('title').text();
    if (options.charset)
        response['charset'] = $("meta[charset]").attr("charset");
    if (options.images) {
        var imagehash = {};
        response['images'] = $('img').map(function (i, elem) {
            var src = $(this).attr('src');
            return URI.resolve(url, src);
        }).filter(function (e) {
            return (e.match(/\.(jpeg|jpg|gif|png|JPEG|JPG|GIF|PNG)$/) != null)
        }).filter(function (item) {
            return imagehash.hasOwnProperty(item) ? false : (imagehash[item] = true);
        });
    }
    if (options.links) {
        var linkhash = {};
        response['links'] = $('a').map(function (i, elem) {
            var href = $(this).attr('href');
            return URI.resolve(url, href);
        }).filter(function (item) {
            return linkhash.hasOwnProperty(item) ? false : (linkhash[item] = true);
        });
    }
    var meta = $('meta'),
        metaData = {};

    var property;
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
    response['uri'] = uri;

    if (options.title)
        response['title'] = metaData['og:title'] || title;
    if (options.description)
        response['description'] = metaData['og:description'] || metaData.description;
    if (options.type)
        response['type'] = metaData['og:type'];
    if (options.url)
        response['url'] = metaData['og:url'] || url;
    if (options.siteName)
        response['siteName'] = metaData['og:site_name'];
    if (options.image)
        response['image'] = metaData['og:image'];
    if (options.meta)
        response['meta'] = metaData;
    return response;
};

Client.fetch = function (url, options, callback) {
    var http_options = {
        timeout: 20000
    }
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
    rest.get(url, http_options).on('complete', function (result) {
        if (result instanceof Error) {
            callback(result);
        } else {
            var meta = parseMeta(url, _options, result);
            callback(null, meta);
        }
    }).on('timeout', function (ms) {
        callback('Timeout');
    });
};

module.exports = Client;
