const http = require('http');
const httpProxy = require('http-proxy');

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
const cmsUrl = process.env.CMS_URL || 'http://127.0.0.1:3003';
const landingUrl = process.env.LANDING_URL || 'http://127.0.0.1:3002';
const port = Number(process.env.PORT || 80);
const stripCmsPrefix = process.env.NODE_ENV === 'production';

const proxy = httpProxy.createProxyServer({ changeOrigin: true, xfwd: true, ws: true });

proxy.on('error', (_error, _req, res) => {
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Upstream service unavailable');
  }
});

function route(req, res, websocket = false, socket, head) {
  const path = req.url || '/';
  const forward = (target) => websocket
    ? proxy.ws(req, socket, head, { target })
    : proxy.web(req, res, { target });

  if (path.startsWith('/api') || path.startsWith('/uploads/')) return forward(backendUrl);

  if (path === '/admin') {
    if (!websocket) {
      res.writeHead(301, { Location: '/admin/' });
      res.end();
    }
    return;
  }

  if (path.startsWith('/admin/')) {
    // Vite dev serves its configured /admin base directly. The production
    // static server is rooted at cms-dist, so it needs the public prefix off.
    if (stripCmsPrefix) req.url = path.slice('/admin'.length) || '/';
    return forward(cmsUrl);
  }

  return forward(landingUrl);
}

const server = http.createServer((req, res) => route(req, res));
server.on('upgrade', (req, socket, head) => route(req, undefined, true, socket, head));
server.listen(port, '0.0.0.0');
