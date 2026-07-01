// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'node:url';

const fromHere = (p) => fileURLToPath(new URL(p, import.meta.url));

// Astro prefixes its OWN generated links (sidebar, etc.) with `base`, but NOT
// hand-written root-absolute links in Markdown/MDX bodies (`[x](/reference/…)`).
// Under /docsite those would point at the demos site and 404, so this rehype pass
// prefixes in-content `/…` href/src with the base. No-op when base is `/`.
function rehypeBasePrefix() {
	const base = (process.env.DOCS_BASE || '/').replace(/\/$/, '');
	return (tree) => {
		if (!base) return; // base is '/'
		const walk = (node) => {
			if (node.type === 'element' && node.properties) {
				for (const attr of ['href', 'src']) {
					const v = node.properties[attr];
					if (
						typeof v === 'string' &&
						v.startsWith('/') &&
						!v.startsWith('//') &&
						v !== base &&
						!v.startsWith(base + '/')
					) {
						node.properties[attr] = base + v;
					}
				}
			}
			node.children?.forEach(walk);
		};
		walk(tree);
	};
}

// https://astro.build/config
export default defineConfig({
	// Hosted on Netlify: the demos site is the root, the docs live under /docsite.
	// `DOCS_BASE` is set by the Netlify build (see netlify.toml); local `astro dev`
	// and `astro build` leave it unset, so they stay at the root.
	site: 'https://prop-for-that.netlify.app',
	base: process.env.DOCS_BASE || '/',
	// GFM (incl. markdown tables) isn't applied to MDX by default in this
	// Astro/Starlight combo, so add it explicitly for tables to render.
	markdown: {
		remarkPlugins: [remarkGfm],
		rehypePlugins: [rehypeBasePrefix],
	},
	// The interactive Demos pages import the library straight from local source.
	vite: {
		resolve: {
			alias: {
				'prop-for-that/plugins': fromHere('../src/plugins/index.ts'),
				'prop-for-that': fromHere('../src/index.ts'),
			},
		},
		server: { fs: { allow: ['..'] } },
	},
	integrations: [
		starlight({
			title: 'prop-for-that',
			description: 'Expose what JavaScript knows but CSS can\'t see.',
			customCss: ['./src/styles/demos.css'],
			// Hero action links are passed through without `base`; this override
			// prefixes them so they work under /docsite. See src/components/Hero.astro.
			components: {
				Hero: './src/components/Hero.astro',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/argyleink/prop-for-that' },
			],
			sidebar: [
				{
					label: 'Start',
					items: [
						{ label: 'Introduction', slug: 'start/introduction' },
						{ label: 'Getting Started', slug: 'start/getting-started' },
					],
				},
				{
					label: 'Demos',
					items: [
						{ label: 'Pointer', slug: 'demos/pointer' },
						{ label: 'Size & viewport', slug: 'demos/size' },
						{ label: 'Visibility', slug: 'demos/visibility' },
						{ label: 'Range', slug: 'demos/range' },
						{ label: 'Select', slug: 'demos/select' },
						{ label: 'Color input', slug: 'demos/color-input' },
						{ label: 'Field', slug: 'demos/field' },
						{ label: 'Field state', slug: 'demos/field-state' },
						{ label: 'Form state', slug: 'demos/form-state' },
						{ label: 'Image color', slug: 'demos/img-color' },
						{ label: 'Video color', slug: 'demos/video-color' },
						{ label: 'Truncated', slug: 'demos/truncated' },
						{ label: 'User agent', slug: 'demos/ua' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'How it works', slug: 'concepts/how-it-works' },
						{ label: 'Naming & cadence', slug: 'concepts/naming-and-cadence' },
						{ label: 'Style queries', slug: 'concepts/style-queries' },
						{ label: 'Typed properties', slug: 'concepts/typed-properties' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Plugins', slug: 'reference/plugins' },
						{ label: 'API', slug: 'reference/api' },
					],
				},
				{
					label: 'Project',
					items: [
						{ label: 'Under consideration', slug: 'considered' },
					],
				},
			],
		}),
	],
});
