/**
 * Simple HTTP server to serve the Agent Health Monitor web app
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Default to index.html
  let filePath = req.url === '/' ? '/index.html' : req.url;

  // Map file paths
  if (filePath.startsWith('/data/')) {
    filePath = path.join(__dirname, filePath);
  } else {
    filePath = path.join(__dirname, 'public', filePath);
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Agent Health Monitor - Web Interface');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  🌐 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  Available pages:');
  console.log('    • http://localhost:3000       - Main Dashboard');
  console.log('    • http://localhost:3000/data/mvp-demo-results.json - API Data');
  console.log('');
  console.log('  Press Ctrl+C to stop the server');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
});
