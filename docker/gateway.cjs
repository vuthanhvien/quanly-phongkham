const http = require('http');
const httpProxy = require('http-proxy');

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
const cmsUrl = process.env.CMS_URL || 'http://127.0.0.1:3003';
const landingUrl = process.env.LANDING_URL || 'http://127.0.0.1:3002';
const port = Number(process.env.PORT || 80);

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  xfwd: true,
  ws: true,
});

proxy.on('error', (error, req, res) => {
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Upstream service unavailable');
    return;
  }

  if (res && typeof res.destroy === 'function') {
    res.destroy(error);
    return;
  }

  if (req && typeof req.destroy === 'function') {
    req.destroy(error);
  }
});

function routeRequest(req, res) {
  const originalPath = req.url || '/';

  if (originalPath === '/admin') {
    res.writeHead(301, { Location: '/admin/' });
    res.end();
    return;
  }

  if (originalPath.startsWith('/api') || originalPath.startsWith('/uploads/')) {
    proxy.web(req, res, { target: backendUrl });
    return;
  }

  if (originalPath.startsWith('/admin/')) {
    req.url = originalPath.replace(/^\/admin/, '') || '/';
    proxy.web(req, res, { target: cmsUrl });
    return;
  }

  proxy.web(req, res, { target: landingUrl });
}

const server = http.createServer(routeRequest);

server.on('upgrade', (req, socket, head) => {
  const originalPath = req.url || '/';

  if (originalPath.startsWith('/admin/')) {
    req.url = originalPath.replace(/^\/admin/, '') || '/';
    proxy.ws(req, socket, head, { target: cmsUrl });
    return;
  }

  if (originalPath.startsWith('/api') || originalPath.startsWith('/uploads/')) {
    proxy.ws(req, socket, head, { target: backendUrl });
    return;
  }

  proxy.ws(req, socket, head, { target: landingUrl });
});

server.listen(port, '0.0.0.0');
