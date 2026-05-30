// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'node:url';

const fromHere = (p) => fileURLToPath(new URL(p, import.meta.url));

// https://astro.build/config
export default defineConfig({
	// GFM (incl. markdown tables) isn't applied to MDX by default in this
	// Astro/Starlight combo, so add it explicitly for tables to render.
	markdown: {
		remarkPlugins: [remarkGfm],
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
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'How it works', slug: 'concepts/how-it-works' },
						{ label: 'Naming & cadence', slug: 'concepts/naming-and-cadence' },
						{ label: 'Style queries', slug: 'concepts/style-queries' },
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
