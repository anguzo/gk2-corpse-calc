import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Pure static preview: no TanStack server or SPA fallback that could hide bad paths.
const root = path.resolve(fileURLToPath(new URL('../dist/client/', import.meta.url)))
const base = process.env.VITE_BASE_PATH || '/'
const port = Number(process.env.PORT || 3002)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.txt': 'text/plain', '.md': 'text/plain' }
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname === base.replace(/\/$/, '')) {
      response.writeHead(301, { Location: base }); response.end(); return
    }
    if (!pathname.startsWith(base)) throw new Error('Outside base path')
    let filename = path.resolve(root, pathname.slice(base.length))
    if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) throw new Error('Outside artifact')
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html')
    const data = await readFile(filename)
    response.writeHead(200, { 'Content-Type': `${types[path.extname(filename)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' })
    response.end(data)
  } catch {
    response.writeHead(404); response.end('Not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`Static Pages preview: http://127.0.0.1:${port}${base}`))
