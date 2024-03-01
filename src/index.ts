import _ from "lodash";
import iconv from 'iconv-lite';
import parser, { MetafetchResponse } from "./parser";
import axios, { AxiosRequestHeaders, AxiosBasicCredentials, AxiosProxyConfig } from "axios";
import { AxiosHeaders } from "axios";

axios.interceptors.response.use(response => {
	let enc = (response.headers['content-type']?.match(/charset=(.+)/) || []).pop();
	if (!enc) {
		// Extracted from <meta charset="gb2312"> or <meta http-equiv=Content-Type content="text/html;charset=gb2312">
		enc = (response.data.toString().match(/<meta.+?charset=['"]?([^"']+)/i) || []).pop()
	}
	if (!enc) {
		// Default utf8
		enc = 'utf-8'
	}
	if (iconv.encodingExists(enc)) {
		response.data = iconv.decode(response.data, enc);
	} else {
		//Fallback to UTF-8
		response.data = iconv.decode(response.data, "utf-8");
	}
	return response;
})

interface FetchOptions {
	userAgent?: string
	http?: {
		headers?: AxiosRequestHeaders,
		timeout?: number,
		maxRedirects?: number,
		auth?: AxiosBasicCredentials,
		proxy?: false | AxiosProxyConfig,
		maxContentLength?: number
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

let franc: ((value?: string | undefined) => string) | ((arg0: string) => string);


class Metafetch {
	private _userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0";
	public setUserAgent(agent: string) {
		if (typeof agent == "string") {
			this._userAgent = agent;
		} else {
			throw new Error("METAFETCH: Invalid User agent supplied");
		}
	}
	get userAgent() {
		return this._userAgent;
	}
	constructor(ua?: string) {
		import('franc').then((f) => {
			franc = f.franc;
		});
		if (ua) {
			this._userAgent = ua;
		}
	}

	public fetch(url: string, options?: FetchOptions) {
		return new Promise<MetafetchResponse>((resolve, reject) => {

			if (typeof url != "string" || url === "") {
				return reject(new Error(`Invalid URL`));
			}
			let cleanurl = url.split("#")[0]; //Remove any anchor fragments
			if (cleanurl === "" || cleanurl.slice(-4) === ".pdf") {
				return reject(new Error(`Invalid URL`));
			}
			const http_options: FetchOptions["http"] = {
				timeout: 20000,
				headers: new AxiosHeaders({
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
					'User-Agent': this._userAgent
				}),
				maxRedirects: 5
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
			let userAgent = this._userAgent;
			if (typeof options === 'object') {
				http_options.timeout = options.http?.timeout || http_options.timeout;
				http_options.maxRedirects = options.http?.maxRedirects || http_options.maxRedirects;
				_.merge(_options, options.flags || {});
				userAgent = options.userAgent || userAgent;
				http_options.headers?.set( options.http?.headers || {});
			}
			axios({
				method: 'get',
				url: cleanurl,
				headers: http_options.headers,
				maxRedirects: http_options.maxRedirects,
				auth: http_options.auth,
				proxy: http_options.proxy,
				timeout: http_options.timeout,
				maxContentLength: http_options.maxContentLength,
				responseType: 'arraybuffer',
			}).then((response) => {
				let result = parser(cleanurl, _options, response.data.toString(), response.headers, franc)
				resolve(result);
			}).catch((err) => {
				if (err.response) {
					return reject(new Error(`HTTP:${err.response.status}`));
				} else if (err.request) {
					// The request was made but no response was received
					// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
					// http.ClientRequest in node.js
					// console.error(err.message);
				} else {
					// if (err.message == "Maximum number of redirects exceeded")
					// 	return reject(new Error(err.message))
					// Something happened in setting up the request that triggered an Error
					// console.log('Error', err.message);
				}
				// console.error(err);
				reject(err);
			})
		});
	}
}

const exportobj = new Metafetch();
export { Metafetch }
export default exportobj;
