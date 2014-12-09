var metafetch = require('./index');

metafetch.fetch('http://www.treehugger.com/cars/tesla-model-x-update-first-ev-towing-capability-dual-motors-falcon-wing-doors-etc.html', function (err, meta) {
    if (err) {
        console.log(err);
    } else {
        console.log('title: ', meta.title);
        console.log('description: ', meta.description);
        console.log('image: ', meta.image);
        console.log('url: ', meta.url);
    }
});
