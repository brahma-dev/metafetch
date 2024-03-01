/*jshint mocha: true*/
var should = require('should'),
	path = require('path'),
	fetchog = require(path.join(__dirname, '../dist/index.js')).default,
	classog = require(path.join(__dirname, '../dist/index.js')).Metafetch;
//Server for redirects
var http = require('http');
var server1;
var server2;
var server3;
describe('server', function () {
	before(function (done) {
		server1 = http.createServer(function (req, res) {
			setTimeout(function () {
				res.writeHead(302, {
					'Location': '/'
				});
				res.end();
			}, 100);
		}).listen(2444, '0.0.0.0');

		server1.on("listening", function () {

			server2 = http.createServer(function (req, res) {
				setTimeout(function () {
					res.setHeader('Content-Type', 'text/html');
					res.write("<html><head></head><body><a href=''>Invalid link</a><img src=''/></body></html>");
					res.end();
				}, 100);
			}).listen(2445, '0.0.0.0');

			server2.on("listening", function () {
				var flip = true;
				server3 = http.createServer(function (req, res) {
					if (flip) {
						setTimeout(function () {
							res.setHeader('Content-Type', 'text/html;charset=xyz20');
							res.writeHead(200);
							res.write("<html lang='en-gb'><head></head><body><a href=''>Invalid link</a><img src=''/></body></html>");
							res.end();
						}, 100);
					} else {
						setTimeout(function () {
							res.writeHead(500);
							res.end();
						}, 100);
					}
					flip = !flip;
				}).listen(2446, '0.0.0.0');

				done();
			})
		});
	});
	after(function (done) {
		server1.close();
		server2.close();
		server3.close();
		done();
	});
	it('should return invalid url error', function (done) {
		fetchog.fetch("").then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			err.message.should.equal("Invalid URL");
			done();
		})
	});
	it('should not return invalid url error', function (done) {
		fetchog.fetch("https://www.rediff.com/news/report/what-next-for-uddhav-thackeray/20191123.htm? var = uddhave next cm").then((res) => {
			done();
		}).catch((err) => {
			done(err);
		})
	});
	it('should return promise', function (done) {
		var res = fetchog.fetch("");
		res.should.be.an.instanceOf(Promise);
		done();
	});
	it('should get a return 404 from npmjs.com', function (done) {
		fetchog.fetch('https://npmjs.com/~brahma-dev/nonexistenturl', {
			flags: {
				images: false,
				links: false
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			err.message.should.equal("HTTP:404");
			done();
		})
	});
	it('should get a meta without error from npmjs.com', function (done) {
		fetchog.fetch('https://npmjs.com/~brahma-dev#someanchor', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 30000
			}
		}).then((res) => {
			should.exist(res);
			should.exist(res.url);
			res.url.host.should.equal('npmjs.com');
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should get a meta without error from npmjs.com', function (done) {
		fetchog.fetch('https://npmjs.com/~brahma-dev#someanchor', {
			flags: {
				title: false,
				description: false,
				type: false,
				url: false,
				siteName: false,
				images: false,
				meta: false,
				links: false,
				charset: false,
				image: false,
				headers: false,
				language: false
			},
			http: {
				timeout: 30000
			}
		}).then((res) => {
			should.exist(res);
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should get a meta without error from bbc.com', function (done) {
		fetchog.fetch('http://www.bbc.com/news/newsbeat-43722444').then((res) => {
			should.exist(res);
			should.exist(res.url);
			res.url.host.should.equal('www.bbc.com');
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should get a meta without error from npmjs.com', function (done) {
		fetchog.fetch('http://npmjs.com/~brahma-dev#someanchor').then((res) => {
			should.exist(res);
			should.exist(res.url);
			res.url.host.should.equal('npmjs.com');
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should get a meta without error from nasa.gov', function (done) {
		// www.nasa.gov adds a trailing slash
		fetchog.fetch('https://www.nasa.gov/technology/carbon-dioxide-fertilization-greening-earth-study-finds/', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 30000
			}
		}).then((res) => {
			should.exist(res);
			should.exist(res.url);
			res.url.host.should.equal('www.nasa.gov');
			res.url.pathname.should.equal('/technology/carbon-dioxide-fertilization-greening-earth-study-finds/');
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should err', function (done) {
		fetchog.fetch('http://0.0.0.0/test.pdf', {
			http: {
				timeout: 1500
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			err.message.should.equal("Invalid URL");
			done();
		})
	});
	it('should get a meta without error from nasa.gov', function (done) {
		// www.nasa.gov adds a trailing slash
		fetchog.fetch('http://www.nasa.gov/technology/carbon-dioxide-fertilization-greening-earth-study-finds/').then((res) => {
			should.exist(res);
			should.exist(res.url);
			res.url.host.should.equal('www.nasa.gov');
			res.url.pathname.should.equal('/technology/carbon-dioxide-fertilization-greening-earth-study-finds/');
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should get a meta without error from test server for invalid links', function (done) {
		fetchog.fetch('http://127.0.0.1:2445/').then((res) => {
			should.exist(res);
			should.exist(res.url);
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should verify http headers', function (done) {
		fetchog.fetch('http://127.0.0.1:2445/').then((res) => {
			should.exist(res);
			should.exist(res.headers);
			should.exist(res.headers['content-type']);
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('should redirect too many times.', function (done) {
		fetchog.fetch('http://127.0.0.1:2444/', {
			http: {
				timeout: 1500,
				headers: { "X-Hello": 1 }
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			err.message.should.equal("Maximum number of redirects exceeded");
			done();
		})
	});
	it('should err', function (done) {
		fetchog.fetch('http://0.0.0.0/', {
			http: {
				timeout: 1500
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			done();
		})
	});
	it('should timeout', function (done) {
		fetchog.fetch('http://127.0.0.1:2444/', {
			http: {
				timeout: 1
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			done();
		})
	});
	it('should fetch Non UTF encoding', function (done) {
		fetchog.fetch('http://cafe.naver.com/joonggonara', {
			http: {
				timeout: 3000
			}
		}).then((res) => {
			should.exist(res);
			should.exist(res.url);
			should.exist(res.language);
			should.exist(res.charset);
			res.charset.should.equal("MS949");
			res.language.should.equal("ko");
			done()
		}).catch((err) => {
			should.not.exist(err);
			done(err);
		});
	});
	it('Failed valid request.', function (done) {
		fetchog.fetch('http://127.0.0.1:2446/test.html', {
			http: {
				timeout: 1500
			}
		}).then((res) => {
			done();
		}).catch((err) => {
			should.not.exist(err);
			done();
		})
	});
	it('Failed valid request.', function (done) {
		fetchog.fetch('http://127.0.0.1:2446/test.html', {
			http: {
				timeout: 1500
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			done();
		})
	});
	it('new instance with user agent without error', function (done) {
		const instance0 = new classog("GOOGLEBOT");
		instance0.userAgent.should.equal('GOOGLEBOT');
		done();
	});
	it('should set user agent without error', function (done) {
		var err;
		try {
			fetchog.setUserAgent("GOOGLEBOT");
		} catch (e) {
			err = e;
		}
		should.not.exist(err);
		fetchog.userAgent.should.equal('GOOGLEBOT');
		done();
	});
	it('Invalid user agent', function (done) {
		var err;
		try {
			fetchog.setUserAgent(123);
		} catch (e) {
			err = e;
		}
		should.exist(err);
		done();
	});
	it('Invalid HTML', function (done) {
		fetchog.fetch('https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg', {
			http: {
				timeout: 1500
			}
		}).then((res) => {
			done(res);
		}).catch((err) => {
			should.exist(err);
			err.message.should.equal("Invalid HTML");
			done();
		})
	});
});
