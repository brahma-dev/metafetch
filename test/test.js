/*jshint mocha: true*/
var should = require('should'),
	path = require('path'),
	fetchog = require(path.join(__dirname, '../index.js'));

describe('fetchog', function() {
	describe('#fetch()', function() {
		it('should get a return 404 from ecoswarm.com', function(done) {
			fetchog.fetch('http://ecoswarm.com/afzaalace/nonexistenturl', {
				flags: {
					images: false,
					links: false
				},
				http: {
					timeout: 30000
				}
			}, function(err, meta) {
				should.exist(err);
				err.should.equal(404);
				done();
			});
		});
		it('should get a meta without error from ecoswarm.com', function(done) {
			fetchog.fetch('http://ecoswarm.com/afzaalace#someanchor', {
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
				meta.uri.host.should.equal('www.ecoswarm.com');
				done();
			});
		});
		it('should get a meta without error from ecoswarm.com', function(done) {
			fetchog.fetch('http://ecoswarm.com/afzaalace#someanchor', function(err, meta) {
				should.not.exist(err);
				should.exist(meta);
				should.exist(meta.uri);
				meta.uri.host.should.equal('www.ecoswarm.com');
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
		it('should get a return 404 from ecoswarm.com', function(done) {
			fetchog.fetch('http://ecoswarm.com/afzaalace/nonexistenturl.pdf', {
				flags: {
					images: false,
					links: false
				},
				http: {
					timeout: 30000
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
					timeout: 30000
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
					timeout: 30000
				}
			}, function(err, meta) {
				should.not.exist(err);
				done();
			});
		});
	});
});
