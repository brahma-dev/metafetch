import _ from "lodash";
const charset = require('superagent-charset');
import rest from "superagent";

charset(rest);

import parseMeta from './parser'

interface FetchOptions {
	userAgent?: string
	http?: {
		headers?: { [key: string]: string }
		timeout?: number,
		followRedirects?: boolean,
		[key: string]: any
	},
	flags?: {
		title?: boolean,
		description?: boolean,
		type?: boolean,
		url?: boolean,
		siteName?: boolean,
		charset?: boolean,
		image?: boolean,
		meta?: boolean,
		images?: boolean,
		links?: boolean,
		headers?: boolean,
		language?: boolean,
	}
}



class Metafetch {
	public userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0";
	public setUserAgent(agent: string) {
		if (typeof agent == "string") {
			this.userAgent = agent;
		} else {
			throw "METAFETCH: Invalid User agent supplied";
		}
	}
	public fetch(url: string, options?: FetchOptions, callback?: Function) {
		return new Promise((resolve, reject) => {
			url = url.split("#")[0]; //Remove any anchor fragments
			const http_options = {
				timeout: 20000,
				headers: {
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
					'User-Agent': ""
				},
				followRedirects: false
			};
			const _options = {
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
			let userAgent = this.userAgent;
			if (typeof options === 'function') {
				callback = options;
			} else if (typeof options === 'object') {
				_.merge(http_options, options.http || {});
				_.merge(_options, options.flags || {});
				userAgent = options.userAgent || userAgent;
			}
			const finish = function (err: any, res?: any) {
				if (typeof callback !== "undefined") {
					return callback(err, res);
				} else if (err) {
					return reject(err);
				}
				return resolve(res);
			};
			if (typeof url != "string" || url === "") {
				return finish("Invalid URL", (url || ""));
			}

			http_options.headers['User-Agent'] = userAgent;
			var redirectCount = 0;
			if (url.slice(-4) === ".pdf") {
				var pdf = function () {
					//TODO : PDF parsing
					rest.get(url).set(http_options.headers).timeout(http_options.timeout).end(function (err, response) {
						if (err && err.timeout) {
							return finish("Timeout");
						}
						if (!!!response) {
							return finish(err);
						}
						if (response.statusType === 2) {
							var meta = parseMeta(url, _options, "Metafetch does not support parsing PDF Content.");
							return finish(null, meta);
						} else {
							return finish(err.status);
						}
					});
				};
				pdf();
			} else {
				rest.get(url).charset().set(http_options.headers).timeout(http_options.timeout).end(function (err, response) {
					if (err && err.timeout) {
						return finish("Timeout");
					}
					if (!!!response) {
						return finish(err);
					}
					if (response.statusType === 2) {
						//@ts-ignore
						var meta = parseMeta(response.request.url, _options, response.text, response.header);
						if (typeof meta == "string") {
							return finish(meta);
						}
						return finish(null, meta);
					} else {
						return finish(err.status);
					}
				});
			}
		})
	}
}

const Client = new Metafetch();

module.exports = Client
