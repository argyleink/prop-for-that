// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'prop-for-that',
			description: 'Expose what JavaScript knows but CSS can\'t see.',
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
						{ label: 'Core sources', slug: 'reference/core-sources' },
						{ label: 'Plugins', slug: 'reference/plugins' },
						{ label: 'API', slug: 'reference/api' },
					],
				},
				{
					label: 'Roadmap',
					items: [
						{ label: 'Roadmap', slug: 'roadmap' },
						{ label: 'Under consideration', slug: 'considered' },
					],
				},
			],
		}),
	],
});
