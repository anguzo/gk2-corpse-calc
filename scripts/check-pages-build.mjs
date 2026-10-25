import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.env.VITE_BASE_PATH || '/'
const root = new URL('../dist/client/', import.meta.url)
const html = await readFile(new URL('index.html', root), 'utf8')
assert(html.includes('Corpse planner'), 'The home page must contain prerendered content.')
assert(html.includes(`${base}assets/`), 'Client assets must use the Pages base path.')
assert(html.includes(`${base}icons/i_skull.svg`), 'Original icon URLs must use the Pages base path.')
assert(html.includes(`href="${base}"`), 'The home link must stay inside the project subpath.')
assert(!html.includes('/game-icons/'), 'Do not distribute the earlier extracted game art.')
for (const file of ['.nojekyll', 'LICENSE.txt', 'ASSET-LICENSE.md', 'dependency-licenses.txt', 'icons/i_skull.svg']) await access(new URL(file, root))
async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? files(full) : [full]
  }))).flat()
}
const outputFiles = await files(fileURLToPath(root))
assert(outputFiles.some((file) => file.endsWith('.wasm')), 'The MIT HiGHS solver must be bundled locally.')
assert(!outputFiles.some((file) => /\.(png|jpe?g|webp|gif|avif)$/i.test(file)), 'Only original SVG art is approved in this build.')
for (const match of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
  const url = match[1]
  if (!url.startsWith(base) || url === base) continue
  await access(new URL(url.slice(base.length), root))
}
console.log(`Static Pages artifact verified for ${base}: prerendered HTML, assets, solver, and license notices.`)
