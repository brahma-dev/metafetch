#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import metafetch from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
let version = '5.0.4';
try {
	// Use import.meta.url to find package.json robustly
	const pkgPath = new URL('../package.json', import.meta.url);
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
	version = pkg.version;
} catch (e) {
	// Fallback to hardcoded version if necessary
}

const helpText = `
Metafetch CLI v${version}

Usage:
  metafetch <url> [options]

Options:
  --help, -h          Show this help message
  --version, -v       Show version number
  --format, -f <fmt>  Output format: json, summary, kv (default: summary for TTY, json otherwise)
  --pretty            Pretty-print JSON output
  --render            Enable Puppeteer rendering (requires puppeteer)
  --head-only         Stop downloading after </head> (faster, non-render only)
  --jsonld-types <t>  Comma-separated list of JSON-LD types to filter
  --user-agent <ua>   Custom User-Agent string
  --flags <f>         Comma-separated list of flags to enable/disable (e.g., links=false,images)

Examples:
  metafetch https://example.com
  metafetch https://example.com --format kv
  metafetch https://example.com --head-only --pretty
  metafetch https://example.com --jsonld-types Product,Recipe
`;

async function run() {
	try {
		const { values, positionals } = parseArgs({
			options: {
				help: { type: 'boolean', short: 'h' },
				version: { type: 'boolean', short: 'v' },
				format: { type: 'string', short: 'f' },
				pretty: { type: 'boolean' },
				render: { type: 'boolean' },
				'head-only': { type: 'boolean' },
				'jsonld-types': { type: 'string' },
				'user-agent': { type: 'string' },
				flags: { type: 'string' },
			},
			allowPositionals: true,
		});

		if (values.help) {
			console.log(helpText);
			return;
		}

		if (values.version) {
			console.log(version);
			return;
		}

		const url = positionals[0];
		if (!url) {
			console.error('Error: URL is required.');
			console.log(helpText);
			process.exit(1);
		}

		const options: any = {
			render: values.render,
			headOnly: values['head-only'],
			userAgent: values['user-agent'],
		};

		if (values['jsonld-types']) {
			options.jsonLdTypes = (values['jsonld-types'] as string).split(',').map(t => t.trim());
		}

		if (values.flags) {
			options.flags = {};
			(values.flags as string).split(',').forEach(part => {
				const [key, val] = part.split('=');
				options.flags[key.trim()] = val === undefined ? true : val === 'true';
			});
		}

		const result = await metafetch.fetch(url, options);

		const format = (values.format as string) || (process.stdout.isTTY ? 'summary' : 'json');

		if (format === 'json') {
			console.log(JSON.stringify(result, null, values.pretty ? 2 : 0));
		} else if (format === 'summary') {
			const fields: [string, string | undefined][] = [
				['Title', result.title],
				['Description', result.description],
				['Type', result.type],
				['URL', result.url],
				['Site Name', result.siteName],
				['Image', result.image],
				['Language', result.language],
				['Favicon', result.favicon],
			];
			for (const [label, value] of fields) {
				if (value) console.log(`${label.padEnd(12)}: ${value}`);
			}
		} else if (format === 'kv') {
			for (const [key, value] of Object.entries(result)) {
				if (value === undefined || value === null) continue;
				const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
				console.log(`${key}="${valStr.replace(/"/g, '\\"')}"`);
			}
		} else {
			console.error(`Error: Unknown format "${format}". Supported formats: json, summary, kv.`);
			process.exit(1);
		}

	} catch (err: any) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

run();
