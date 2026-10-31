import { readFile, writeFile } from 'node:fs/promises';
const filename = new URL('../dist/index.html', import.meta.url);
const html = (await readFile(filename, 'utf8')).replace('<html lang="en">', '<html lang="vi">').replace('href="/spoty-X/favicon.ico"', 'href="/spoty-X/favicon.svg" type="image/svg+xml"').replace('</head>', '<meta name="theme-color" content="#080a09" /></head>');
await writeFile(filename, html);
await writeFile(new URL('../dist/.nojekyll', import.meta.url), '');
