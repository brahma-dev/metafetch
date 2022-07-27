//import metafetch from 'metafetch'; // Runkit does not support import
const metafetch = require("metafetch").default;

metafetch.fetch('http://www.treehugger.com/those-falcon-wing-doors-are-coming-back-haunt-tesla-4858047').then(function(meta) {
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
	console.log('Language: ', meta.language);
}).catch(console.error);

/* Optional flags to disable parsing images and links and http timeout or headers

metafetch.fetch('http://www.treehugger.com/those-falcon-wing-doors-are-coming-back-haunt-tesla-4858047', {
	flags: {
		images: false,
		links: false,
		headers: false,
		language: false
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
	//console.log('Type: ', meta.type);
	console.log('URL: ', meta.url);
	console.log('AMPURL: ', meta.ampURL);
	//console.log('SiteName: ', meta.siteName);
	//console.log('Charset: ', meta.charset);
	console.log('Image: ', meta.image);
	//console.log('Meta: ', meta.meta);
});
*/
