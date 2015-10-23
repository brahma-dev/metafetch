var should = require('should'),
    fetchog = require('../index.js');


describe('fetchog', function () {
    describe('#fetch()', function () {
        it('should get a meta without error from yahoo.com', function (done) {
            fetchog.fetch('https://www.yahoo.com', function (err, meta) {
                should.not.exist(err);
                should.exist(meta);
                should.exist(meta.title);
                meta.title.should.equal('Yahoo');
                should.exist(meta.uri);
                meta.uri.host.should.equal('www.yahoo.com');
                //console.log('meta', meta);
                done();
            });
        });
    });
});
