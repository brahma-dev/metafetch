var metafetch = require('./index');

metafetch.fetch('http://www.treehugger.com/cars/tesla-model-x-update-first-ev-towing-capability-dual-motors-falcon-wing-doors-etc.html', function (err, meta) {
    console.log('title: ', meta.title);
    console.log('description: ', meta.description);
    console.log('type: ', meta.type);
    console.log('url: ', meta.url);
    console.log('siteName: ', meta.siteName);
    console.log('charset: ', meta.charset);
    console.log('image: ', meta.image);
    console.log('meta: ', meta.meta);
    console.log('images: ', meta.images);
    console.log('links: ', meta.links);
});

// Flags disable parsing images and links

metafetch.fetch('http://www.treehugger.com/cars/tesla-model-x-update-first-ev-towing-capability-dual-motors-falcon-wing-doors-etc.html', {
    images: false,
    links: false
}, function (err, meta) {
    console.log('title: ', meta.title);
    console.log('description: ', meta.description);
    console.log('type: ', meta.type);
    console.log('url: ', meta.url);
    console.log('siteName: ', meta.siteName);
    console.log('charset: ', meta.charset);
    console.log('image: ', meta.image);
    console.log('meta: ', meta.meta);
});
