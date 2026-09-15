// Minimal static server - no dependencies. Railway provides HTTPS, which the mic API requires.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const FILES = new Set(['/index.html', '/matcher.js']);

http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  if (!FILES.has(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)], 'Cache-Control': 'no-cache' });
  fs.createReadStream(path.join(__dirname, p)).pipe(res);
}).listen(PORT, () => console.log('listening on ' + PORT));
