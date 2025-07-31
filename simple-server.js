// Simple test server
import http from 'http';

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Server is working!</h1>');
});

server.listen(3001, () => {
    console.log('Test server running on http://localhost:3001');
});

server.on('error', (error) => {
    console.error('Server error:', error);
});