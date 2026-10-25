import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const base = process.env.VITE_BASE_PATH || '/'
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('VITE_BASE_PATH must start and end with /')

const config = defineConfig({
  base,
  publicDir: 'static',
  worker: { format: 'es' },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart({ router: { basepath: base }, prerender: { enabled: true } }), viteReact()],
})

export default config
