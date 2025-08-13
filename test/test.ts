import { expect } from 'chai';
import http, { Server } from 'node:http';
import { Metafetch } from '../src/index.js';

describe('Metafetch: Final Optimized Tests', () => {
	// --- Server Definitions ---
	let serverInvalidAssets: Server, serverUaEcho: Server, serverEmptyBody: Server,
		serverPrimaryMeta: Server, serverBaseTag: Server, serverCharset: Server,
		serverFallbackMeta: Server, serverAssetFallback: Server, serverBaseNoHref: Server,
		serverMalformedAssets: Server, serverAmp: Server, serverHttp: Server, serverJsonLd: Server;

	before((done) => {
		serverInvalidAssets = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html><body><a href=""></a><img src="javascript:void(0)"><a></a></body></html>`);
		}).listen(2445, '127.0.0.1');
		serverUaEcho = http.createServer((req, res) => {
			const ua = req.headers['user-agent'] || '';
			res.setHeader('Content-Type', 'text/html').end(`<html><head><meta name="x-request-ua" content="${ua}"></head></html>`);
		}).listen(2447, '127.0.0.1');
		serverEmptyBody = http.createServer((req, res) => res.writeHead(200).end()).listen(2448, '127.0.0.1');
		serverPrimaryMeta = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html lang="en-GB"><head><meta property="og:description" content="OG description"><meta property="og:image" content="http://127.0.0.1/og.png"></head></html>`);
		}).listen(2449, '127.0.0.1');
		serverBaseTag = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html><head><base href="http://assets.example.com/files/"><title>X</title></head><body><img src="logo.png"><a href="about.html">About</a></body></html>`);
		}).listen(2502, '127.0.0.1');
		serverCharset = http.createServer((req, res) => {
			if (req.url === '/header') res.setHeader('Content-Type', 'text/html; charset=iso-8859-1').end('<body></body>');
			else res.setHeader('Content-Type', 'text/html').end('<head><meta charset="windows-1252"></head>');
		}).listen(2503, '127.0.0.1');
		serverFallbackMeta = http.createServer((req, res) => {
			res.setHeader('Content-Language', 'de-DE').setHeader('Content-Type', 'text/html').end(`<html><head><meta name="description" content="Plain description fallback"><meta name="twitter:image" content="http://127.0.0.1/twitter.png"></head></html>`);
		}).listen(2505, '127.0.0.1');
		serverAssetFallback = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html><head><title>X</title></head><body><img src="/image.png"></body></html>`);
		}).listen(2507, '127.0.0.1');
		serverBaseNoHref = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html><head><base><link rel="canonical" href="/canonical"></head></html>`);
		}).listen(2508, '127.0.0.1');
		serverMalformedAssets = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html><body><img src="http://:80"><a href="http://:80"></a></body></html>`);
		}).listen(2509, '127.0.0.1');
		serverAmp = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`<html><head><link rel="amphtml" href="/amp.html"></head></html>`);
		}).listen(2510, '127.0.0.1');
		serverHttp = http.createServer((req, res) => {
			if (req.url === '/404') res.writeHead(404, 'Not Found').end();
			else if (req.url?.startsWith('/page')) res.setHeader('Content-Type', 'text/html').end('<html><title>T</title></html>');
			else res.setHeader('Content-Type', 'application/pdf').end('%PDF-1.4');
		}).listen(2511, '127.0.0.1');
		serverJsonLd = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html');
			let body = '';
			switch (req.url) {
				case '/basic':
					body = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"Article Headline"}</script></head></html>`;
					break;
				case '/nested':
					body = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","author":{"@type":"Person","name":"Jane Doe"}, "unsupported": ["item1", "item2"]}</script></head></html>`;
					break;
				case '/malformed':
					body = `<html><head><meta name="description" content="Good"><script type="application/ld+json">{ "key": "value", </script></head></html>`;
					break;
				case '/multiple':
					body = `<html><head><meta name="description" content="A page with two scripts."><script type="application/ld+json">{"@type":"Organization","name":"My Company"}</script><script type="application/ld+json">{"@type":"WebSite","url":"https://example.com"}</script></head></html>`;
					break;
				case '/empty':
					body = `<html><head><script type="application/ld+json"></script></head></html>`;
					break;
				case '/non_object':
					body = `<html><head><script type="application/ld+json">"this is a string, not an object"</script></head></html>`;
					break;
			}
			res.end(body);
		}).listen(2512, '127.0.0.1');
		serverJsonLd.on('listening', done);
	});

	after(() => {
		serverInvalidAssets.close(); serverUaEcho.close(); serverEmptyBody.close();
		serverPrimaryMeta.close(); serverBaseTag.close(); serverCharset.close();
		serverFallbackMeta.close(); serverAssetFallback.close(); serverBaseNoHref.close();
		serverMalformedAssets.close(); serverAmp.close(); serverHttp.close(); serverJsonLd.close();
	});

	// --- Test Suites ---

	describe('1. Core API & Input Validation', () => {
		let counter = 0;
		it((++counter).toString().padStart(2, '0') + '. should return a Promise', () => {
			const promise = new Metafetch().fetch('http://127.0.0.1:2511/page');
			expect(promise).to.be.an.instanceOf(Promise);
			promise.catch(() => { });
		});

		it((++counter).toString().padStart(2, '0') + '. should reject with an error for an empty URL', async () => {
			try {
				await new Metafetch().fetch("");
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Invalid URL: URL must be a non-empty string.");
			}
		});
	});

	describe('2. HTTP & Network Handling', () => {
		let counter = 0;
		it((++counter).toString().padStart(2, '0') + '. should handle non-2xx status codes', async () => {
			try {
				await new Metafetch().fetch('http://127.0.0.1:2511/404');
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.match(/Request failed with status: 404/);
			}
		});

		it((++counter).toString().padStart(2, '0') + '. should handle non-HTML content gracefully', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2511/pdf');
			expect(res.title).to.equal('');
		});

		it((++counter).toString().padStart(2, '0') + '. should throw an error for an empty response body', async () => {
			try {
				await new Metafetch().fetch('http://127.0.0.1:2448/');
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Received an empty response body.");
			}
		});
	});

	describe('3. User-Agent Management', () => {
		let counter = 0;
		it((++counter).toString().padStart(2, '0') + '. should manage the instance user agent correctly', () => {
			const instance = new Metafetch("InstanceUA/1.0");
			expect(instance.userAgent).to.equal('InstanceUA/1.0');
			instance.setUserAgent("InstanceUA/2.0");
			expect(instance.userAgent).to.equal("InstanceUA/2.0");

			try {
				instance.setUserAgent(" ");
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Invalid User Agent: Must be a non-empty string.");
			}
		});

		it((++counter).toString().padStart(2, '0') + '. should use the correct user agent for requests', async () => {
			const instance = new Metafetch("DefaultUA/1.0");
			const res1 = await instance.fetch('http://127.0.0.1:2447/');
			expect(res1.meta!['x-request-ua']).to.equal('DefaultUA/1.0');

			const res2 = await instance.fetch('http://127.0.0.1:2447/', { userAgent: 'PerCallUA/1.0' });
			expect(res2.meta!['x-request-ua']).to.equal('PerCallUA/1.0');

			const res3 = await instance.fetch('http://127.0.0.1:2447/', { fetch: { headers: { 'User-Agent': 'FetchHeaderUA/1.0' } } });
			expect(res3.meta!['x-request-ua']).to.equal('FetchHeaderUA/1.0');
		});
	});

	describe('4. Metadata & Content Parsing', () => {
		let counter = 0;
		it((++counter).toString().padStart(2, '0') + '. should extract metadata with correct fallback logic', async () => {
			const instance = new Metafetch();
			const res1 = await instance.fetch('http://127.0.0.1:2449/');
			expect(res1.description).to.equal('OG description');
			expect(res1.image).to.equal('http://127.0.0.1/og.png');
			expect(res1.language).to.equal('en');

			const res2 = await instance.fetch('http://127.0.0.1:2505/');
			expect(res2.description).to.equal('Plain description fallback');
			expect(res2.image).to.equal('http://127.0.0.1/twitter.png');
			expect(res2.language).to.equal('de');
		});

		it((++counter).toString().padStart(2, '0') + '. should detect charset, preferring header over meta tag', async () => {
			const instance = new Metafetch();
			const resHeader = await instance.fetch('http://127.0.0.1:2503/header');
			expect(resHeader.charset).to.equal('iso-8859-1');
			const resMeta = await instance.fetch('http://127.0.0.1:2503/meta');
			expect(resMeta.charset).to.equal('windows-1252');
		});

		it((++counter).toString().padStart(2, '0') + '. should correctly extract the ampURL', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2510/');
			expect(res.ampURL).to.equal('http://127.0.0.1:2510/amp.html');
		});
	});

	describe('5. URL & Asset Resolution', () => {
		let counter = 0;
		it((++counter).toString().padStart(2, '0') + '. should correctly resolve assets using the <base> tag', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2502/');
			expect(res.url).to.equal('http://127.0.0.1:2502/');
			expect(res.images).to.include('http://assets.example.com/files/logo.png');
			expect(res.links).to.include('http://assets.example.com/files/about.html');
		});

		it((++counter).toString().padStart(2, '0') + '. should handle a <base> tag with no href attribute', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2508/');
			expect(res.url).to.equal('http://127.0.0.1:2508/canonical');
		});

		it((++counter).toString().padStart(2, '0') + '. should resolve asset URLs against originalURL as a fallback', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2507/some/path', { flags: { url: false, images: true } });
			expect(res.url).to.be.undefined;
			expect(res.images).to.include('http://127.0.0.1:2507/image.png');
		});

		it((++counter).toString().padStart(2, '0') + '. should ignore various invalid asset sources', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2445/');
			expect(res.links).to.be.an('array').that.is.empty;
			expect(res.images).to.be.an('array').that.is.empty;
		});

		it((++counter).toString().padStart(2, '0') + '. should handle malformed URLs in assets and not throw', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2509/');
			expect(res.images).to.be.an('array').that.is.empty;
		});
	});

	describe('6. Feature Flags', () => {
		let counter = 0;
		it((++counter).toString().padStart(2, '0') + '. should respect disabled processing flags', async () => {
			const res = await new Metafetch().fetch('http://127.0.0.1:2502/', {
				flags: { meta: false, links: false }
			});
			expect(res.meta).to.be.undefined;
			expect(res.links).to.be.undefined;
			expect(res.url).to.not.be.undefined;
			expect(res.images).to.be.an('array').that.is.not.empty;
		});
	});

	describe('7. Structured Data (JSON-LD)', () => {
		let counter = 0;
		const instance = new Metafetch();

		it((++counter).toString().padStart(2, '0') + '. should extract basic, flat JSON-LD data', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/basic');
			expect(res.meta).to.deep.include({
				'ld:@context': 'https://schema.org',
				'ld:@type': 'NewsArticle',
				'ld:headline': 'Article Headline'
			});
		});

		it((++counter).toString().padStart(2, '0') + '. should extract and flatten nested JSON-LD data', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/nested');
			expect(res.meta).to.deep.include({
				'ld:@context': 'https://schema.org',
				'ld:author:@type': 'Person',
				'ld:author:name': 'Jane Doe'
			});
			// The current implementation doesn't handle arrays, so 'unsupported' should not exist
			expect(res.meta).to.not.have.property('ld:unsupported');
		});

		it((++counter).toString().padStart(2, '0') + '. should handle malformed JSON-LD gracefully without crashing', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/malformed');
			// Regular meta tags should still be parsed
			expect(res.meta!.description).to.equal('Good');
			// Malformed ld+json should not add any 'ld:' keys
			const ldKeys = Object.keys(res.meta!).filter(k => k.startsWith('ld:'));
			expect(ldKeys).to.be.empty;
		});

		it((++counter).toString().padStart(2, '0') + '. should merge data from multiple JSON-LD scripts', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/multiple');
			// Note: The current implementation overwrites duplicate keys.
			expect(res.meta).to.deep.equal({
				'description': 'A page with two scripts.',
				'ld:@type': 'WebSite', // Overwritten by second script
				'ld:name': 'My Company',
				'ld:url': 'https://example.com'
			});
		});

		it((++counter).toString().padStart(2, '0') + '. should not extract JSON-LD when meta flag is disabled', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/basic', { flags: { meta: false } });
			expect(res.meta).to.be.undefined;
		});

		it((++counter).toString().padStart(2, '0') + '. should handle an empty JSON-LD script tag', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/empty');
			expect(res.meta).to.be.an('object').that.is.empty;
		});

		it((++counter).toString().padStart(2, '0') + '. should ignore JSON-LD content that is not a JSON object', async () => {
			const res = await instance.fetch('http://127.0.0.1:2512/non_object');
			expect(res.meta).to.be.an('object').that.is.empty;
			const ldKeys = Object.keys(res.meta!).filter(k => k.startsWith('ld:'));
			expect(ldKeys).to.be.empty;
		});
	});
});
