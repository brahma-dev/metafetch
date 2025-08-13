import { expect } from 'chai';
import http, { Server } from 'node:http';
import { Metafetch } from '../src/index.js';
import sinon from 'sinon';
import puppeteer from 'puppeteer';

describe('Metafetch: Optimized Tests', () => {
	let testServer: Server;
	let serverSpa: Server;
	let serverRetry: Server;
	let serverEncoding: Server;
	const PORT = 2555;
	const BASE_URL = `http://127.0.0.1:${PORT}`;

	before((done) => {
		// Stateless server to handle the majority of test cases.
		testServer = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			let body = '<html><head></head><body></body></html>';

			switch (req.url) {
				case '/page':
					body = '<html><title>T</title></html>';
					break;
				case '/ua-echo':
					const ua = req.headers['user-agent'] || '';
					body = `<html><head><meta name="x-request-ua" content="${ua}"></head></html>`;
					break;
				case '/primary-meta':
					body = `<html lang="en-GB"><head><meta property="og:description" content="OG description"><meta property="og:image" content="${BASE_URL}/og.png"></head></html>`;
					break;
				case '/fallback-meta':
					res.setHeader('Content-Language', 'de-DE');
					body = `<html><head><meta name="description" content="Plain description fallback"><meta name="twitter:image" content="${BASE_URL}/twitter.png"></head></html>`;
					break;
				case '/charset-header':
					res.setHeader('Content-Type', 'text/html; charset=iso-8859-1').end('<body></body>');
					return;
				case '/charset-meta':
					res.setHeader('Content-Type', 'text/html');
					body = '<head><meta charset="windows-1252"></head>';
					break;
				case '/base-tag':
					body = `<html><head><base href="http://assets.example.com/files/"><title>X</title></head><body><img src="logo.png"><a href="about.html">About</a></body></html>`;
					break;
				case '/base-no-href':
					body = `<html><head><base><link rel="canonical" href="/canonical"></head></html>`;
					break;
				case '/asset-fallback':
					body = `<html><head><title>X</title></head><body><img src="/image.png"></body></html>`;
					break;
				case '/invalid-assets':
					body = `<html><body><a href=""></a><img src="javascript:void(0)"><a></a></body></html>`;
					break;
				case '/malformed-assets':
					body = `<html><body><img src="http://:80"><a href="http://:80"></a></body></html>`;
					break;
				case '/amp':
					body = `<html><head><link rel="amphtml" href="/amp.html"></head></html>`;
					break;
				case '/json-ld/basic':
					body = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"Article Headline"}</script></head></html>`;
					break;
				case '/json-ld/nested':
					body = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","author":{"@type":"Person","name":"Jane Doe"}}</script></head></html>`;
					break;
				case '/json-ld/complex':
					body = `<html><head><script type="application/ld+json">{
						"@context": "https://schema.org/", "@type": "Recipe", "name": "Grandma's Cookies", "author": { "@type": "Person", "name": "John Smith" },
						"recipeIngredient": [ "Flour", "Sugar" ], "review": [ { "@type": "Review", "reviewRating": { "@type": "Rating", "ratingValue": "5" }, "author": { "@type": "Person", "name": "Alice" } } ]
					}</script></head></html>`;
					break;
				case '/json-ld/array':
					body = `<html><head><script type="application/ld+json">[{"@type": "Person", "name": "Alice"},{"@type": "Person", "name": "Bob"}]</script></head></html>`;
					break;
				case '/json-ld/with-null':
					body = `<html><head><script type="application/ld+json">{"@type":"Person","name":"Alice","affiliation":null}</script></head></html>`;
					break;
				case '/json-ld/malformed':
					body = `<html><head><meta name="description" content="Good"><script type="application/ld+json">{ "key": "value", </script></head></html>`;
					break;
				case '/json-ld/multiple':
					body = `<html><head><meta name="description" content="A page with two scripts."><script type="application/ld+json">{"@type":"Organization","name":"My Company"}</script><script type="application/ld+json">{"@type":"WebSite","url":"https://example.com"}</script></head></html>`;
					break;
				case '/json-ld/empty':
					body = `<html><head><script type="application/ld+json"></script></head></html>`;
					break;
				case '/json-ld/non-object':
					body = `<html><head><script type="application/ld+json">"this is a string"</script></head></html>`;
					break;
				case '/coverage/meta-charset':
					res.setHeader('Content-Type', 'text/html'); // No charset in header
					body = '<html><head><meta charset="gb2312"></head></html>';
					break;
				case '/coverage/no-charset':
					res.setHeader('Content-Type', 'text/html'); // No charset in header
					body = '<html><head><title>No Charset</title></head></html>';
					break;
				case '/fav/simple':
					body = `<html><head><link rel="icon" href="/fav.ico"></head></html>`;
					break;
				case '/fav/multi':
					body = `<html><head><link rel="icon" href="/icon_16.png" sizes="16x16"><link rel="apple-touch-icon" href="/apple_57.png" sizes="57x57"><link rel="apple-touch-icon" href="/apple_180.png" sizes="180x180"><link rel="icon" href="/icon_32.png" sizes="32x32"></head></html>`;
					break;
				case '/fav/no-favicon':
					break;
				case '/fav/invalid':
					body = `<html><head><link href="/no_rel.ico"><link rel="icon"><link rel="icon" href=""><link rel="icon" href="data:image/x-icon;base64,AA"></head></html>`;
					break;
				case '/fav/standard-only':
					body = `<html><head><link rel="icon" href="/icon_16.png" sizes="16x16"><link rel="icon" href="/icon_32.png" sizes="32x32"></head></html>`;
					break;
				case '/feeds':
					body = `<html><head><link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml"><link rel="alternate" type="application/atom+xml" title="Atom" href="https://example.com/atom.xml"></head></html>`;
					break;
				case '/404':
					res.writeHead(404, 'Not Found').end();
					return;
				case '/empty-body':
					res.writeHead(200).end();
					return;
				case '/pdf':
					res.setHeader('Content-Type', 'application/pdf').end('%PDF-1.4');
					return;
			}
			res.end(body);
		}).listen(PORT, '127.0.0.1');

		// Server for testing client-side rendering with Puppeteer.
		serverSpa = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html').end(`
                <html>
                    <head><title>Initial Title</title></head>
                    <body>
                        <script>
                            setTimeout(() => {
                                document.title = 'Rendered Title';
                                const meta = document.createElement('meta');
                                meta.setAttribute('name', 'description');
                                meta.setAttribute('content', 'Rendered Description');
                                document.head.appendChild(meta);
                            }, 100);
                        </script>
                    </body>
                </html>`);
		}).listen(PORT + 1, '127.0.0.1');

		// A stateful server to test retry logic.
		const requestCounts = new Map<string, number>();
		serverRetry = http.createServer((req, res) => {
			const url = req.url || '/';
			const count = requestCounts.get(url) || 0;
			requestCounts.set(url, count + 1);

			if (url === '/fail-once' && count < 1) {
				res.writeHead(500).end();
			} else if (url === '/fail-always') {
				res.writeHead(503).end();
			} else {
				res.setHeader('Content-Type', 'text/html').end('<html><title>Success</title></html>');
			}
		}).listen(PORT + 2, '127.0.0.1');

		// Server for testing raw buffer and Byte Order Mark (BOM) detection.
		serverEncoding = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html');
			if (req.url === '/utf8-bom') {
				res.end(Buffer.from([0xEF, 0xBB, 0xBF, ...Buffer.from('<html><title>BOM</title></html>')]));
			} else if (req.url === '/utf16le-bom') {
				res.end(Buffer.from([0xFF, 0xFE, ...Buffer.from('<html><title>BOM</title></html>', 'utf16le')]));
			} else if (req.url === '/utf16be-bom') {
				const content = '<html><title>BOM</title></html>';
				const leBuffer = Buffer.from(content, 'utf16le');
				const beBuffer = Buffer.alloc(leBuffer.length);
				for (let i = 0; i < leBuffer.length; i += 2) {
					beBuffer[i] = leBuffer[i + 1];
					beBuffer[i + 1] = leBuffer[i];
				}
				res.end(Buffer.concat([Buffer.from([0xFE, 0xFF]), beBuffer]));
			} else if (req.url === '/xml-encoding') {
				res.setHeader('Content-Type', 'application/xml').end(`<?xml version="1.0" encoding="iso-8859-2"?><doc/>`);
			} else if (req.url === '/bom-over-header') {
				res.setHeader('Content-Type', 'text/html; charset=iso-8859-1');
				res.end(Buffer.from([0xEF, 0xBB, 0xBF, ...Buffer.from('<html><title>Priority</title></html>')]));
			}
		}).listen(PORT + 3, '127.0.0.1');

		serverEncoding.on('listening', done);
	});

	after(() => {
		testServer.close();
		serverSpa.close();
		serverRetry.close();
		serverEncoding.close();
	});

	describe('Core API & Input Validation', () => {
		it('should return a Promise', () => {
			const promise = new Metafetch().fetch(`${BASE_URL}/page`);
			expect(promise).to.be.an.instanceOf(Promise);
			promise.catch(() => { });
		});

		it('should reject with an error for an empty URL', async () => {
			try {
				await new Metafetch().fetch("");
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Invalid URL: URL must be a non-empty string.");
			}
		});
	});

	describe('HTTP & Network Handling', () => {
		it('should reject on non-2xx status codes', async () => {
			try {
				await new Metafetch().fetch(`${BASE_URL}/404`);
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.match(/Request failed with status: 404/);
			}
		});

		it('should handle non-HTML content gracefully', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/pdf`);
			expect(res.title).to.equal('');
		});

		it('should throw an error for an empty response body', async () => {
			try {
				await new Metafetch().fetch(`${BASE_URL}/empty-body`);
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Received an empty response body.");
			}
		});
	});

	describe('User-Agent Management', () => {
		it('should manage the instance user agent correctly', () => {
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

		it('should use the correct user agent based on priority', async () => {
			const instance = new Metafetch("DefaultUA/1.0");
			const res1 = await instance.fetch(`${BASE_URL}/ua-echo`);
			expect(res1.meta!['x-request-ua']).to.equal('DefaultUA/1.0');

			const res2 = await instance.fetch(`${BASE_URL}/ua-echo`, { userAgent: 'PerCallUA/1.0' });
			expect(res2.meta!['x-request-ua']).to.equal('PerCallUA/1.0');

			const res3 = await instance.fetch(`${BASE_URL}/ua-echo`, { fetch: { headers: { 'User-Agent': 'FetchHeaderUA/1.0' } } });
			expect(res3.meta!['x-request-ua']).to.equal('FetchHeaderUA/1.0');
		});
	});

	describe('Metadata & Content Parsing', () => {
		it('should extract metadata with correct fallback logic', async () => {
			const instance = new Metafetch();
			const res1 = await instance.fetch(`${BASE_URL}/primary-meta`);
			expect(res1.description).to.equal('OG description');
			expect(res1.image).to.equal(`${BASE_URL}/og.png`);
			expect(res1.language).to.equal('en');

			const res2 = await instance.fetch(`${BASE_URL}/fallback-meta`);
			expect(res2.description).to.equal('Plain description fallback');
			expect(res2.image).to.equal(`${BASE_URL}/twitter.png`);
			expect(res2.language).to.equal('de');
		});

		it('should detect charset, preferring header over meta tag', async () => {
			const instance = new Metafetch();
			const resHeader = await instance.fetch(`${BASE_URL}/charset-header`);
			expect(resHeader.charset).to.equal('iso-8859-1');
			const resMeta = await instance.fetch(`${BASE_URL}/charset-meta`);
			expect(resMeta.charset).to.equal('windows-1252');
		});

		it('should correctly extract the ampURL', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/amp`);
			expect(res.ampURL).to.equal(`${BASE_URL}/amp.html`);
		});
	});

	describe('URL & Asset Resolution', () => {
		it('should correctly resolve assets using the <base> tag', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/base-tag`);
			expect(res.images).to.include('http://assets.example.com/files/logo.png');
			expect(res.links).to.include('http://assets.example.com/files/about.html');
		});

		it('should handle a <base> tag with no href attribute', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/base-no-href`);
			expect(res.url).to.equal(`${BASE_URL}/canonical`);
		});

		it('should resolve asset URLs against originalURL as a fallback', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/asset-fallback`, { flags: { url: false } });
			expect(res.images).to.include(`${BASE_URL}/image.png`);
		});

		it('should ignore various invalid asset sources', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/invalid-assets`);
			expect(res.links).to.be.an('array').that.is.empty;
			expect(res.images).to.be.an('array').that.is.empty;
		});

		it('should handle malformed URLs in assets without throwing', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/malformed-assets`);
			expect(res.images).to.be.an('array').that.is.empty;
		});
	});

	describe('Feature Flags', () => {
		it('should respect disabled processing flags', async () => {
			const res = await new Metafetch().fetch(`${BASE_URL}/base-tag`, {
				flags: { meta: false, links: false, favicon: false, feeds: false }
			});
			expect(res.meta).to.be.undefined;
			expect(res.links).to.be.undefined;
			expect(res.favicon).to.be.undefined;
			expect(res.feeds).to.be.undefined;
			expect(res.url).to.not.be.undefined;
			expect(res.images).to.be.an('array').that.is.not.empty;
		});
	});

	describe('Structured Data (JSON-LD)', () => {
		const instance = new Metafetch();

		it('should extract and flatten basic, nested, and complex JSON-LD', async () => {
			const res = await instance.fetch(`${BASE_URL}/json-ld/complex`);
			expect(res.meta).to.deep.include({
				'ld:@context': 'https://schema.org/',
				'ld:@type': 'Recipe',
				'ld:name': "Grandma's Cookies",
				'ld:author:@type': 'Person',
				'ld:author:name': 'John Smith',
				'ld:recipeIngredient:0': 'Flour',
				'ld:recipeIngredient:1': 'Sugar',
				'ld:review:0:@type': 'Review',
				'ld:review:0:reviewRating:@type': 'Rating',
				'ld:review:0:reviewRating:ratingValue': '5',
				'ld:review:0:author:@type': 'Person',
				'ld:review:0:author:name': 'Alice',
			});
		});

		it('should handle a top-level JSON-LD array', async () => {
			const res = await instance.fetch(`${BASE_URL}/json-ld/array`);
			expect(res.meta).to.deep.include({
				'ld:0:@type': 'Person', 'ld:0:name': 'Alice',
				'ld:1:@type': 'Person', 'ld:1:name': 'Bob',
			});
		});

		it('should correctly ignore null values in JSON-LD', async () => {
			const res = await instance.fetch(`${BASE_URL}/json-ld/with-null`);
			expect(res.meta).to.deep.include({ 'ld:@type': 'Person', 'ld:name': 'Alice' });
			expect(res.meta).to.not.have.property('ld:affiliation');
		});

		it('should handle malformed JSON-LD gracefully', async () => {
			// Console needs to be stubbed because CI fails if something is printed on console.warn/console.error
			const consoleStub = sinon.stub(console, 'warn');

			try {
				const res = await instance.fetch(`${BASE_URL}/json-ld/malformed`);
				expect(res.meta!.description).to.equal('Good');
				const ldKeys = Object.keys(res.meta!).filter(k => k.startsWith('ld:'));
				expect(ldKeys).to.be.empty;
				expect(consoleStub.calledOnce).to.be.true;

			} finally {
				consoleStub.restore();
			}
		});

		it('should merge data from multiple JSON-LD scripts', async () => {
			const res = await instance.fetch(`${BASE_URL}/json-ld/multiple`);
			expect(res.meta).to.deep.include({
				'description': 'A page with two scripts.',
				'ld:name': 'My Company',
				'ld:url': 'https://example.com'
			});
		});

		it('should ignore JSON-LD content that is not a JSON object or array', async () => {
			const res = await instance.fetch(`${BASE_URL}/json-ld/non-object`);
			const ldKeys = Object.keys(res.meta!).filter(k => k.startsWith('ld:'));
			expect(ldKeys).to.be.empty;
		});
	});

	describe('Headless Browser Rendering (Puppeteer)', () => {
		const instance = new Metafetch();
		const SPA_URL = `http://127.0.0.1:${PORT + 1}`;

		it('should NOT get dynamic content without the render flag', async () => {
			const res = await instance.fetch(SPA_URL);
			expect(res.title).to.equal('Initial Title');
			expect(res.description).to.be.undefined;
		});

		it('should get dynamic content when the render flag is true', async function () {
			this.timeout(15000);
			const res = await instance.fetch(SPA_URL, { render: true });
			expect(res.title).to.equal('Rendered Title');
			expect(res.description).to.equal('Rendered Description');
		});

		it('should reject on puppeteer navigation failure', async function () {
			this.timeout(15000);
			try {
				await instance.fetch('http://127.0.0.1:9999/', { render: true });
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.include("ERR_CONNECTION_REFUSED");
			}
		});

		it('should reject when puppeteer.goto returns a null response (mocked)', async () => {
			const mockPage = {
				goto: sinon.stub().resolves(null),
				setUserAgent: sinon.stub().resolves(),
			};
			const mockBrowser = {
				newPage: sinon.stub().resolves(mockPage as any),
				close: sinon.stub().resolves(),
			};
			const launchStub = sinon.stub(puppeteer, 'launch').resolves(mockBrowser as any);

			try {
				await instance.fetch(`${BASE_URL}/page`, { render: true });
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Puppeteer navigation failed to return a response.");
			} finally {
				launchStub.restore();
			}
		});

		it('should reject on non-2xx status in render mode', async function () {
			this.timeout(10000);
			try {
				await instance.fetch(`${BASE_URL}/404`, { render: true });
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.match(/Request failed with status: 404/);
			}
		});

		it('should reject on an empty response body in render mode', async function () {
			this.timeout(10000);
			try {
				await instance.fetch(`${BASE_URL}/empty-body`, { render: true });
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.equal("Received an empty response body.");
			}
		});

		it('should throw a helpful error when puppeteer fails to import', async () => {
			const newInstance = new Metafetch();
			// Stub the private method to simulate an import failure
			const importStub = sinon.stub(newInstance as any, '_getPuppeteer').rejects(new Error('Simulated import failure'));

			try {
				await newInstance.fetch(`${BASE_URL}/page`, { render: true });
				throw new Error("Test failed: Metafetch should have thrown an error.");
			} catch (err: any) {
				expect(err.message).to.equal('The "render" option requires the "puppeteer" package. Please install it (`npm install puppeteer`) and try again.');
			} finally {
				importStub.restore();
			}
		});
	});

	describe('Request Retries', () => {
		const instance = new Metafetch();
		const RETRY_URL = `http://127.0.0.1:${PORT + 2}`;

		it('should succeed on the first attempt without retrying', async () => {
			const res = await instance.fetch(`${RETRY_URL}/success`, { retries: 3, retryDelay: 50 });
			expect(res.title).to.equal('Success');
		});

		it('should fail once then succeed on the first retry', async () => {
			const startTime = Date.now();
			const res = await instance.fetch(`${RETRY_URL}/fail-once`, { retries: 1, retryDelay: 50 });
			const duration = Date.now() - startTime;
			expect(res.title).to.equal('Success');
			expect(duration).to.be.greaterThan(50);
		});

		it('should fail after all retries are exhausted', async () => {
			try {
				await instance.fetch(`${RETRY_URL}/fail-always`, { retries: 2, retryDelay: 50 });
				throw new Error("Should have failed");
			} catch (err: any) {
				expect(err.message).to.match(/Request failed with status: 503/);
			}
		});

		it('should succeed on retry with puppeteer', async function () {
			this.timeout(10000);
			const res = await instance.fetch(`${RETRY_URL}/fail-once`, { render: true, retries: 1, retryDelay: 50 });
			expect(res.title).to.equal('Success');
		});
	});

	describe('Character Encoding Detection', () => {
		const instance = new Metafetch();
		const ENCODING_URL = `http://127.0.0.1:${PORT + 3}`;

		it('should detect charset from a UTF-8 BOM', async () => {
			const res = await instance.fetch(`${ENCODING_URL}/utf8-bom`);
			expect(res.charset).to.equal('utf-8');
			expect(res.title).to.equal('BOM');
		});

		it('should detect charset from UTF-16LE and UTF-16BE BOMs', async () => {
			const resLE = await instance.fetch(`${ENCODING_URL}/utf16le-bom`);
			expect(resLE.charset).to.equal('utf-16le');
			const resBE = await instance.fetch(`${ENCODING_URL}/utf16be-bom`);
			expect(resBE.charset).to.equal('utf-16be');
		});

		it('should detect charset from an XML declaration', async () => {
			const res = await instance.fetch(`${ENCODING_URL}/xml-encoding`);
			expect(res.charset).to.equal('iso-8859-2');
		});

		it('should prioritize BOM over the Content-Type header', async () => {
			const res = await instance.fetch(`${ENCODING_URL}/bom-over-header`);
			expect(res.charset).to.equal('utf-8');
			expect(res.title).to.equal('Priority');
		});

		it('should detect charset from meta tag when header is missing', async () => {
			const res = await instance.fetch(`${BASE_URL}/coverage/meta-charset`);
			expect(res.charset).to.equal('gb2312');
		});

		it('should default to utf-8 when no charset is found anywhere', async () => {
			const res = await instance.fetch(`${BASE_URL}/coverage/no-charset`);
			expect(res.charset).to.equal('utf-8');
		});
	});

	describe('Favicon & Feed Extraction', () => {
		const instance = new Metafetch();

		it('should prioritize the largest apple-touch-icon', async () => {
			const res = await instance.fetch(`${BASE_URL}/fav/multi`);
			expect(res.favicon).to.equal(`${BASE_URL}/apple_180.png`);
		});

		it('should choose the largest standard icon if no apple icons exist', async () => {
			const res = await instance.fetch(`${BASE_URL}/fav/standard-only`);
			expect(res.favicon).to.equal(`${BASE_URL}/icon_32.png`);
		});

		it('should fall back to /favicon.ico when no valid icons are found', async () => {
			const noIconPage = await instance.fetch(`${BASE_URL}/fav/no-favicon`);
			expect(noIconPage.favicon).to.equal(`${BASE_URL}/favicon.ico`);

			const invalidIconPage = await instance.fetch(`${BASE_URL}/fav/invalid`);
			expect(invalidIconPage.favicon).to.equal(`${BASE_URL}/favicon.ico`);
		});

		it('should discover both RSS and Atom feeds', async () => {
			const res = await instance.fetch(`${BASE_URL}/feeds`);
			expect(res.feeds).to.be.an('array').with.lengthOf(2);
			expect(res.feeds).to.include(`${BASE_URL}/rss.xml`);
			expect(res.feeds).to.include('https://example.com/atom.xml');
		});
	});
});
