// Combine the two built sub-sites into one Netlify publish directory:
//   _site/           ← the demos app (Vite), served at the site root
//   _site/docsite/   ← the Starlight docs, served at /docsite (matches astro `base`)
//   _site/llms.txt   ← the LLM reference, served at the root (llmstxt.org convention)
// Run after `build:demos` and `build:docs`. Invoked by `npm run build:site`.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs'

for (const dir of ['demos/dist', 'docs/dist']) {
  if (!existsSync(dir)) {
    console.error(`assemble-site: missing ${dir} — build the demos and docs first`)
    process.exit(1)
  }
}

rmSync('_site', { recursive: true, force: true })
mkdirSync('_site', { recursive: true })
cpSync('demos/dist', '_site', { recursive: true })
cpSync('docs/dist', '_site/docsite', { recursive: true })
cpSync('llms.txt', '_site/llms.txt') // serve at the root: the canonical llms.txt discovery path

console.log('assemble-site: built _site/ (demos → /, docs → /docsite/, llms.txt → /llms.txt)')
