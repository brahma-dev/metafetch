/*jshint mocha: true*/
var should = require('should'),
	path = require('path'),
	fetchog = require(path.join(__dirname, '../index.js'));

//Server for redirects
var http = require('http');
var server1;
var server2;
describe('server', function() {
	before(function(done) {
		server1 = http.createServer(function(req, res) {
			setTimeout(function() {
				res.writeHead(302, {
					'Location': '/'
				});
				res.end();
			}, 100);
		}).listen(14444);
		server1.on("listening", function() {
			done();
		});
		server2 = http.createServer(function(req, res) {
			setTimeout(function() {
				res.write("<html><head></head><body><a href=''>Invalid link</a></body></html>");
				res.end();
			}, 100);
		}).listen(14445);
	});
	after(function(done) {
		server1.close();
		server2.close();
		done();
	});
	it('should return invalid url error', function(done) {
		fetchog.fetch("", function(err, meta) {
			should.exist(err);
			err.should.equal("Invalid URL");
			done();
		});
	});
	it('should return nothing', function(done) {
		var err = fetchog.fetch("");
		should.not.exist(err);
		done();
	});
	it('should get a return 404 from linc.world', function(done) {
		fetchog.fetch('http://linc.world/afzaalace/nonexistenturl', {
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
	it('should get a meta without error from linc.world', function(done) {
		fetchog.fetch('http://linc.world/afzaalace#someanchor', {
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
			meta.uri.host.should.equal('www.linc.world');
			done();
		});
	});
	it('should get a meta without error from linc.world', function(done) {
		fetchog.fetch('http://linc.world/afzaalace#someanchor', {
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
				image: false
			},
			http: {
				timeout: 30000
			}
		}, function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.linc.world');
			done();
		});
	});
	it('should get a meta without error from linc.world', function(done) {
		fetchog.fetch('http://linc.world/afzaalace#someanchor', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			meta.uri.host.should.equal('www.linc.world');
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
		fetchog.fetch('http://127.0.0.1:14445/', function(err, meta) {
			should.not.exist(err);
			should.exist(meta);
			should.exist(meta.uri);
			done();
		});
	});
	it('should redirect too many times.', function(done) {
		fetchog.fetch('http://127.0.0.1:14444/', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal("Too many redirects");
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
		fetchog.fetch('http://nonexistntmisspeleddomani' + (new Date().getTime()).toString(36) + '.ocm', {
			http: {
				timeout: 1
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal("Timeout");
			done();
		});
	});
	it('should get a return 404 from linc.world', function(done) {
		fetchog.fetch('http://linc.world/afzaalace/nonexistenturl.pdf', {
			flags: {
				images: false,
				links: false
			},
			http: {
				timeout: 1500
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
		fetchog.fetch('http://nonexistntmisspeleddomani' + (new Date().getTime()).toString(36) + '.ocm/test.pdf', {
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
		fetchog.fetch('http://127.0.0.1:14444/test.pdf', {
			http: {
				timeout: 1500
			}
		}, function(err, meta) {
			should.exist(err);
			err.should.equal("Too many redirects");
			done();
		});
	});
});
