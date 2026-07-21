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
				link: '/docs/gettingstarted/index',
				collapsed: true,
				items: [
					{ text: 'Mod文件', link: '/docs/gettingstarted/modfiles' },
					{ text: '组织你的模组', link: '/docs/gettingstarted/structuring' },
					{ text: '版本管理', link: '/docs/gettingstarted/versioning' },
				],
			},
			{
				text: '基本概念',
				collapsed: true,
				items: [
					{ text: '注册表（Registries）', link: '/docs/concepts/registries' },
					{ text: '端（Sides）', link: '/docs/concepts/sides' },
					{ text: '事件机制（Events）', link: '/docs/concepts/events' },
				],
			},
			{
				text: '方块（Blocks）',
				link: '/docs/blocks/index',
				collapsed: true,
				items: [{ text: '方块状态（Blockstates）', link: '/docs/blocks/states' }],
			},
			{
				text: '物品（Items）',
				link: '/docs/items/index',
				collapsed: true,
				items: [
					{ text: '交互（Interactions）', link: '/docs/items/interactions' },
					{ text: '数据组件（Data Components）', link: '/docs/items/datacomponents' },
					{ text: '消耗品（Consumables）', link: '/docs/items/consumables' },
					{ text: '工具（Tools）', link: '/docs/items/tools' },
					{ text: '盔甲（Armor）', link: '/docs/items/armor' },
					{ text: '生物效果与药水', link: '/docs/items/mobeffects' },
				],
			},
			{
				text: '实体对象（Entities）',
				link: '/docs/entities/index',
				collapsed: true,
				items: [
					{ text: '数据与网络', link: '/docs/entities/data' },
					{ text: '消耗品（Consumables）', link: '/docs/items/consumables' },
					{ text: '工具（Tools）', link: '/docs/items/tools' },
					{ text: '盔甲（Armor）', link: '/docs/items/armor' },
					{ text: '生物效果与药水', link: '/docs/items/mobeffects' },
				],
			},
		],
		socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
	},
});
