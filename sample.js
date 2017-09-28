var metafetch = require('metafetch');

metafetch.fetch('http://www.treehugger.com/cars/tesla-model-x-update-first-ev-towing-capability-dual-motors-falcon-wing-doors-etc.html', function (err, meta) {
	if (err) {
		return console.error(err);
	}
	console.log('Title: ', meta.title);
	console.log('Description: ', meta.description);
	//console.log('Type: ', meta.type);
	console.log('URL: ', meta.url);
	console.log('AMPURL: ', meta.ampURL);
	//console.log('SiteName: ', meta.siteName);
	//console.log('Charset: ', meta.charset);
	console.log('Image: ', meta.image);
	//console.log('Meta: ', meta.meta);
	console.log('Images: ', meta.images);
	console.log('Links: ', meta.links);
	console.log('Headers: ', meta.headers);
});

/* Optional flags to disable parsing images and links and http timeout or headers

metafetch.fetch('http://www.treehugger.com/cars/tesla-model-x-update-first-ev-towing-capability-dual-motors-falcon-wing-doors-etc.html', {
	flags: {
		images: false,
		links: false
	},
	http: {
		timeout: 30000
	}
}, function (err, meta) {
	if (err) {
		return console.error(err);
	}
	console.log('Title: ', meta.title);
	console.log('Description: ', meta.description);
	console.log('Type: ', meta.type);
	console.log('URL: ', meta.url);
	console.log('SiteName: ', meta.siteName);
	console.log('Charset: ', meta.charset);
	console.log('Image: ', meta.image);
});
*/
