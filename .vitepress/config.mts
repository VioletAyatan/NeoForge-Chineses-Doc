import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'MC NeoFroge 中文编程手册',
	description: 'MC NeoFroge 中文编程手册',
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Examples', link: '/markdown-examples' },
		],

		sidebar: [
			{
				text: '入门',
				items: [
					{ text: 'NeoFroge入门', link: '/docs/gettingstarted/index' },
					{ text: 'Mod文件', link: '/docs/gettingstarted/modfiles' },
					{ text: '组织你的模组', link: '/docs/gettingstarted/structuring' },
					{ text: '版本管理', link: '/docs/gettingstarted/versioning' },
				],
			},
			{
				text: '基本概念',
				items: [
					{ text: '注册表（Registries）', link: '/docs/concepts/registries' },
					{ text: '端（Sides）', link: '/docs/concepts/sides' },
					{ text: '事件（Events）', link: '/docs/concepts/events' },
				],
			},
		],
		socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
	},
});
