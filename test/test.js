/*jshint mocha: true*/
var should = require('should'),
	path = require('path'),
	fetchog = require(path.join(__dirname, '../index.js'));

describe('fetchog', function() {
	describe('#fetch()', function() {
		it('should get a meta without error from ecoswarm.com', function(done) {
			fetchog.fetch('http://www.ecoswarm.com/afzaalace#someanchor', function(err, meta) {
				should.not.exist(err);
				should.exist(meta);
				should.exist(meta.uri);
				meta.uri.host.should.equal('www.ecoswarm.com');
				done();
			});
		});
	});
});
