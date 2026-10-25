import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
const notices = [await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')]
for (const [location, info] of Object.entries(lock.packages)) {
  if (!location || !location.includes('node_modules/')) continue
  const directory = path.join(root, location)
  try { await access(directory) } catch { continue } // OS-specific optional packages need not be installed.
  const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  const licenseFiles = (await readdir(directory)).filter((name) => /^(licen[sc]e|copying|notice)(\.|$|-)/i.test(name)).sort()
  notices.push(`\n=== ${pkg.name}@${info.version} (${pkg.license || 'see package notice'}) ===\n`)
  for (const name of licenseFiles) {
    try { notices.push(`${name}\n${await readFile(path.join(directory, name), 'utf8')}`) } catch { /* A LICENSE directory is not a text file. */ }
  }
}
await writeFile(path.join(root, 'static/dependency-licenses.txt'), notices.join('\n'))
await writeFile(path.join(root, 'static/LICENSE.txt'), await readFile(path.join(root, 'LICENSE'), 'utf8'))
console.log('Prepared project and dependency licenses for the static site.')
