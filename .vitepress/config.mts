import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'NeoFroge 中文编程手册',
	description: 'Minecraft NeoFroge 中文编程手册',
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Examples', link: '/markdown-examples' },
		],

		sidebar: [
			{
				text: '模组编程入门',
				link: '/docs/gettingstarted/index',
				collapsed: false,
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
					{ text: '生物效果与药水（Mob Effects & Potions）', link: '/docs/items/mobeffects' },
				],
			},
			{
				text: '实体（Entities）',
				link: '/docs/entities/index',
				collapsed: true,
				items: [
					{ text: '数据与网络（Data & Networking）', link: '/docs/entities/data' },
					{
						text: '生命实体、生物、玩家（Living Entity、Mob & Player）',
						link: '/docs/entities/livingentity',
					},
					{ text: '属性（Attributes）', link: '/docs/entities/attributes' },
					{ text: '渲染器（Renderer）', link: '/docs/entities/renderer' },
				],
			},
			{
				text: '方块实体（Block Entities）',
				link: '/docs/blockentities/index',
				collapsed: true,
				items: [{ text: '方块实体渲染器（BlockEntityRenderer）', link: '/docs/blockentities/ber' }],
			},
			{
				text: '资源（Resources）',
				link: '/docs/resources/index',
				collapsed: true,
				items: [
					{ text: '资源元数据（Resource Metadata）', link: '/docs/resources/metadata' },
					{
						text: '客户端（Client）',
						collapsed: true,
						items: [
							{
								text: 'I18n and L10n',
								link: '/docs/resources/client/i18n',
							},
							{
								text: '模型（Models）',
								link: '/docs/resources/client/models/index',
								collapsed: true,
								items: [],
							},
							{
								text: '粒子（Particles）',
								link: '/docs/resources/client/particles',
							},
							{
								text: '音效（Sounds）',
								link: '/docs/resources/client/sounds',
							},
							{
								text: '纹理（Textures）',
								link: '/docs/resources/client/textures',
							},
						],
					},
					{
						text: '服务端（Server）',
						collapsed: true,
						items: [{ text: '成就（Advancements）', link: '/docs/resources/server/advancements' }],
					},
				],
			},
		],
		socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
	},
});
