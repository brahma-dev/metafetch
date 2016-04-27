/*jshint mocha: true*/
var should = require('should'),
	path = require('path'),
	fetchog = require(path.join(__dirname, '../index.js'));

describe('fetchog', function() {
	describe('#fetch()', function() {
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
			fetchog.fetch('http://www.nasa.gov/feature/goddard/2016/carbon-dioxide-fertilization-greening-earth', function(err, meta) {
				should.not.exist(err);
				should.exist(meta);
				should.exist(meta.uri);
				meta.uri.host.should.equal('www.nasa.gov');
				meta.uri.path.should.equal('/feature/goddard/2016/carbon-dioxide-fertilization-greening-earth/');
				done();
			});
		});
	});
});
