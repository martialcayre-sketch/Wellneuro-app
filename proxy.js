const http = require('http');
const { execSync } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end();
    return;
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { action, params } = JSON.parse(body);
      const cmd = params
        ? `clasp run ${action} -p '${JSON.stringify(params)}'`
        : `clasp run ${action}`;
      const raw = execSync(cmd, { encoding: 'utf8', cwd: '/workspaces/nutriconsult-nnpp2-gas-mvp' });
      let result;
      try { result = JSON.parse(raw); } catch { result = raw.trim(); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
});

server.listen(3000, () => console.log('Proxy GAS démarré sur http://localhost:3000'));
