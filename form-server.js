// Simple HTTP server to serve the diagnostic form
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS for API calls to Mastra
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html for root requests
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = path.join(PUBLIC_DIR, pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    console.log(`${req.method} ${req.url} -> ${filePath}`);
    
    // Check if file exists and is within public directory
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>404 - Page Not Found</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                text-align: center; 
                                padding: 50px;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                min-height: 100vh;
                                margin: 0;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-direction: column;
                            }
                            h1 { font-size: 3rem; margin-bottom: 20px; }
                            p { font-size: 1.2rem; margin-bottom: 30px; }
                            a { 
                                color: #fff; 
                                text-decoration: none; 
                                background: rgba(255,255,255,0.2);
                                padding: 10px 20px;
                                border-radius: 5px;
                                border: 2px solid rgba(255,255,255,0.3);
                                transition: all 0.3s;
                            }
                            a:hover { 
                                background: rgba(255,255,255,0.3);
                                transform: translateY(-2px);
                            }
                        </style>
                    </head>
                    <body>
                        <div>
                            <h1>🏥 404 - Page Not Found</h1>
                            <p>The requested file could not be found.</p>
                            <a href="/">← Back to Dr. House Diagnostic System</a>
                        </div>
                    </body>
                    </html>
                `);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log('\\n🏥 Dr. House Diagnostic Form Server');
    console.log('=====================================');
    console.log(`🌐 Form Interface: http://localhost:${PORT}`);
    console.log(`🔗 Mastra API: http://localhost:4111`);
    console.log('=====================================');
    console.log('📋 Instructions:');
    console.log('1. Make sure your Mastra server is running: npm run dev (port 4111)');
    console.log('2. Open the form interface in your browser');
    console.log('3. Fill out a patient case and run diagnosis!');
    console.log('\\n🎯 Ready to diagnose! Dr. House would be proud...\\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n👋 Shutting down Dr. House Diagnostic Form Server...');
    server.close(() => {
        console.log('🏥 Server closed. Thanks for using the diagnostic system!');
        process.exit(0);
    });
});

// Error handling
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please:`);
        console.error('1. Stop any other servers running on this port');
        console.error('2. Or change the PORT variable in form-server.js');
        console.error('3. Then try again');
    } else {
        console.error('❌ Server error:', error.message);
    }
    process.exit(1);
});