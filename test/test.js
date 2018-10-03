/*jshint mocha: true*/
var should = require('should'),
	path = require('path'),
	fetchog = require(path.join(__dirname, '../index.js'));
//Server for redirects
var http = require('http');
var server1;
var server2;
var server3;
describe('server', function() {
	before(function(done) {
		server1 = http.createServer(function(req, res) {
			setTimeout(function() {
				res.writeHead(302, {
					'Location': '/'
				});
				res.end();
			}, 100);
		}).listen(2444, '0.0.0.0');

		server1.on("listening", function() {

			server2 = http.createServer(function(req, res) {
				setTimeout(function() {
					res.setHeader('Content-Type', 'text/html');
					res.write("<html><head></head><body><a href=''>Invalid link</a><img src=''/></body></html>");
					res.end();
				}, 100);
			}).listen(2445, '0.0.0.0');

			server2.on("listening", function() {
				var flip = true;
				server3 = http.createServer(function(req, res) {
					if (flip) {
						setTimeout(function() {
							res.setHeader('Content-Type', 'text/html');
							res.writeHead(200);
							res.end();
						}, 100);
					} else {
						setTimeout(function() {
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
	after(function(done) {
		server1.close();
		server2.close();
		server3.close();
		done();
	});
	it('should return invalid url error', function(done) {
		fetchog.fetch("", function(err, meta) {
			should.exist(err);
			err.should.equal("Invalid URL");
			done();
		});
	});
	it('should return promise', function(done) {
		var err = fetchog.fetch("").catch(() => null);
		err.should.be.an.instanceOf(Promise);
		done();
	});
	it('should return promise', function(done) {
		var res = fetchog.fetch("https://npmjs.com/~brahma-dev").then(() => null);
		res.should.be.an.instanceOf(Promise);
		done();
	});
	it('should get a return 404 from npmjs.com', function(done) {
		fetchog.fetch('https://npmjs.com/~brahma-dev/nonexistenturl', {
			flags: {
				images: false,
				links: false
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal(404);
			done();
		});
	});
	it('should get a meta without error from npmjs.com', function(done) {
		fetchog.fetch('https://npmjs.com/~brahma-dev#someanchor', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 30000
			}
		}, function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.npmjs.com');
			done();
		});
	});
	it('should get a meta without error from npmjs.com', function(done) {
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
		}, function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.npmjs.com');
			done();
		});
	});
	it('should get a meta without error from bbc.com', function(done) {
		fetchog.fetch('http://www.bbc.com/news/newsbeat-43722444', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.bbc.com');
			done();
		});
	});
	it('should get a meta without error from npmjs.com', function(done) {
		fetchog.fetch('http://npmjs.com/~brahma-dev#someanchor', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.npmjs.com');
			done();
		});
	});
	it('should get a meta without error from nasa.gov', function(done) {
		// www.nasa.gov adds a trailing slash
		fetchog.fetch('http://www.nasa.gov/feature/goddard/2016/carbon-dioxide-fertilization-greening-earth', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 30000
			}
		}, function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.nasa.gov');
			meta.uri.path.should.equal('/feature/goddard/2016/carbon-dioxide-fertilization-greening-earth/');
			done();
		});
	});
	it('should get a meta without error from nasa.gov', function(done) {
		// www.nasa.gov adds a trailing slash
		fetchog.fetch('http://www.nasa.gov/feature/goddard/2016/carbon-dioxide-fertilization-greening-earth', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.nasa.gov');
			meta.uri.path.should.equal('/feature/goddard/2016/carbon-dioxide-fertilization-greening-earth/');
			done();
		});
	});
	it('should get a meta without error from test server for invalid links', function(done) {
		fetchog.fetch('http://127.0.0.1:2445/', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			done();
		});
	});
	it('should verify http headers', function(done) {
		fetchog.fetch('http://127.0.0.1:2445/', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.headers);
			should.exist(meta.headers['content-type']);
			done();
		});
	});
	it('should redirect too many times.', function(done) {
		fetchog.fetch('http://127.0.0.1:2444/', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal(302);
			done();
		});
	});
	it('should err', function(done) {
		fetchog.fetch('http://0.0.0.0/', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			done();
		});
	});
	it('should timeout', function(done) {
		fetchog.fetch('http://example.com:81', {
			http: {
				timeout: 1
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal("Timeout");
			done();
		});
	});
	it('should get a return 404 from npmjs.com', function(done) {
		fetchog.fetch('http://npmjs.com/brahma-dev/nonexistenturl.pdf', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 5000
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal(404);
			done();
		});
	});
	it('should get a return 404 from example.com', function(done) {
		fetchog.fetch('http://www.example.com/test.pdf', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			done();
		});
	});
	it('should get a pdf from pdf995.com', function(done) {
		fetchog.fetch('http://www.pdf995.com/samples/pdf.pdf', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.not.exist(err);
			done();
		});
	});
	it('should err', function(done) {
		fetchog.fetch('http://0.0.0.0/test.pdf', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			done();
		});
	});
	it('should timeout', function(done) {
		fetchog.fetch('http://example.com:81/test.pdf', {
			http: {
				timeout: 1
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal("Timeout");
			done();
		});
	});
	it('should redirect too many times.', function(done) {
		fetchog.fetch('http://127.0.0.1:2444/test.pdf', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal(302);
			done();
		});
	});
	it('should fetch Non UTF encoding', function(done) {
		fetchog.fetch('http://cafe.naver.com/joonggonara', {
			http: {
				timeout: 3000
			}
		}, function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			done();
		});
	});
	it('Failed valid request.', function(done) {
		fetchog.fetch('http://127.0.0.1:2446/test.html', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.not.exist(err);
			done();
		});
	});
	it('Failed valid request.', function(done) {
		fetchog.fetch('http://127.0.0.1:2446/test.pdf', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			done();
		});
	});
	it('should set user agent without error', function(done) {
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
	it('Invalid user agent', function(done) {
		var err;
		try {
			fetchog.setUserAgent(123);
		} catch (e) {
			err = e;
		}
		should.exist(err);
		done();
	});
	it('Invalid HTML', function(done) {
		fetchog.fetch('https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal("Invalid HTML");
			done();
		});
	});
});
