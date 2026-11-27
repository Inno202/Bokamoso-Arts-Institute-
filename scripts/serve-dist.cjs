// Serves dist/ the way GitHub Pages does (/dir -> /dir/, index.html, 404.html),
// so the pre-rendered build can be tested locally. Usage: node scripts/serve-dist.cjs [dist] [port]
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = process.argv[2] || 'dist', port = Number(process.argv[3] || 4321), base = '/Bokamoso-Arts-Institute-';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith(base)) { res.writeHead(404); return res.end(); }
  let file = path.join(root, url.slice(base.length));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { location: url + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
  const type = types[path.extname(file)] || 'application/octet-stream';
  // Text is sent compressed, as GitHub Pages does, so speed checks measure what visitors get.
  if (/text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', vary: 'Accept-Encoding' });
    return res.end(zlib.gzipSync(fs.readFileSync(file)));
  }
  res.writeHead(200, { 'content-type': type }); res.end(fs.readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}${base}/`));
