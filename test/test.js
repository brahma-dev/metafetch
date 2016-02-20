var should = require('should'),
    fetchog = require('../index.js');


describe('fetchog', function () {
    describe('#fetch()', function () {
        it('should get a meta without error from ecoswarm.com', function (done) {
            fetchog.fetch('http://ecoswarm.com/afzaalace', function (err, meta) {
                should.not.exist(err);
                should.exist(meta);
                should.exist(meta.uri);
                meta.uri.host.should.equal('www.ecoswarm.com');
                //console.log('meta', meta);
                done();
            });
        });
    });
});
