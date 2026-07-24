import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'NeoForge 中文编程手册',
	description: 'Minecraft NeoForge 中文编程手册',
	themeConfig: {
		logo: {
			src: '/logo.svg',
		},
		outline: {
			label: '页面导航',
			level: [2, 3],
		},
		search: {
			provider: 'local',
		},
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: '首页', link: '/' },
			{ text: '文档', link: '/docs/gettingstarted/index' },
			{
				text: '版本',
				items: [{ text: '26.1', link: '/docs/gettingstarted/index' }],
			},
		],
		sidebar: [
			{
				text: '模组编程入门',
				link: '/docs/gettingstarted/index',
				collapsed: false,
				items: [
					{ text: '模组文件', link: '/docs/gettingstarted/modfiles' },
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
					{ text: '事件系统（Events）', link: '/docs/concepts/events' },
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
					{ text: '数据与网络（Data and Networking）', link: '/docs/entities/data' },
					{
						text: '生命实体、生物、玩家（Living Entities, Mobs & Players）',
						link: '/docs/entities/livingentity',
					},
					{ text: '属性（Attributes）', link: '/docs/entities/attributes' },
					{ text: '实体渲染器（Entity Renderers）', link: '/docs/entities/renderer' },
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
								text: '国际化与本地化（I18n and L10n）',
								link: '/docs/resources/client/i18n',
							},
							{
								text: '模型（Models）',
								link: '/docs/resources/client/models/index',
								collapsed: true,
								items: [
									{
										text: '模型数据生成（Model Datagen）',
										link: '/docs/resources/client/models/datagen',
									},
									{
										text: '客户端物品（Client Item）',
										link: '/docs/resources/client/models/items',
									},
									{
										text: '自定义模型加载器（Custom Model Loader）',
										link: '/docs/resources/client/models/modelloaders',
									},
									{
										text: '理解模型系统（Understanding the Model System）',
										link: '/docs/resources/client/models/modelsystem',
									},
								],
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
						items: [
							{ text: '成就（Advancements）', link: '/docs/resources/server/advancements' },
							{
								text: '数据加载条件（Data Load Conditions）',
								link: '/docs/resources/server/conditions',
							},
							{
								text: '伤害类型与伤害来源（Damage Types & Damage Sources）',
								link: '/docs/resources/server/damagetypes',
							},
							{
								text: '数据映射（Data Maps）',
								link: '/docs/resources/server/datamaps/index',
								collapsed: true,
								items: [
									{
										text: '内置数据映射（Built-in Data Maps）',
										link: '/docs/resources/server/datamaps/builtin',
									},
								],
							},
							{
								text: '附魔（Enchantments）',
								link: '/docs/resources/server/enchantments/index',
								collapsed: true,
								items: [
									{
										text: '内置附魔效果组件（Built-in Enchantment Effect Components）',
										link: '/docs/resources/server/enchantments/builtin',
									},
								],
							},
							{
								text: '战利品表（Loot Tables）',
								link: '/docs/resources/server/loottables/index',
								collapsed: true,
								items: [
									{
										text: '自定义战利品对象（Custom Loot Objects）',
										link: '/docs/resources/server/loottables/custom',
									},
									{
										text: '全局战利品修改器（Global Loot Modifiers）',
										link: '/docs/resources/server/loottables/glm',
									},
									{
										text: '战利品条件（Loot Conditions）',
										link: '/docs/resources/server/loottables/lootconditions',
									},
									{
										text: '战利品函数（Loot Functions）',
										link: '/docs/resources/server/loottables/lootfunctions',
									},
								],
							},
							{
								text: '配方（Recipes）',
								link: '/docs/resources/server/recipes/index',
								collapsed: true,
								items: [
									{
										text: '内置配方类型（Built-in Recipe Types）',
										link: '/docs/resources/server/recipes/builtin',
									},
									{
										text: '自定义配方（Custom Recipes）',
										link: '/docs/resources/server/recipes/custom',
									},
									{
										text: '原料（Ingredient）',
										link: '/docs/resources/server/recipes/ingredients',
									},
								],
							},
							{
								text: '标签（Tags）',
								link: '/docs/resources/server/tags',
							},
						],
					},
				],
			},
			{
				text: '资源存储与转移（Inventories & Transfers）',
				collapsed: true,
				items: [
					{ text: '容器（Containers）', link: '/docs/inventories/container' },
					{ text: '能力（Capabilities）', link: '/docs/inventories/capabilities' },
					{ text: '菜单（Menus）', link: '/docs/inventories/menus' },
					{ text: '事务（Transactions）', link: '/docs/inventories/transactions' },
				],
			},
			{
				text: '数据存储（Data Storage）',
				collapsed: true,
				items: [
					{ text: '命名二进制标签（Named Binary Tag (NBT)）', link: '/docs/datastorage/nbt' },
					{ text: '编解码器（Codecs）', link: '/docs/datastorage/codecs' },
					{ text: 'Value I/O', link: '/docs/datastorage/valueio' },
					{ text: '数据附件（Data Attachments）', link: '/docs/datastorage/attachments' },
					{ text: '数据存档（Saved Data）', link: '/docs/datastorage/saveddata' },
				],
			},
			{
				text: '世界生成（Worldgen）',
				collapsed: true,
				items: [
					{ text: '生物群系修饰符（Biome Modifiers）', link: '/docs/worldgen/biomemodifier' },
				],
			},
			{
				text: '网络通讯（Networking）',
				collapsed: true,
				link: '/docs/networking/index',
				items: [
					{ text: '注册Payload（Registering Payloads）', link: '/docs/networking/payload' },
					{ text: '流编解码器（Stream Codecs）', link: '/docs/networking/streamcodecs' },
					{
						text: '使用配置任务（Using Configuration Tasks）',
						link: '/docs/networking/configuration-tasks',
					},
				],
			},
			{
				text: '渲染（Rendering）',
				collapsed: true,
				items: [
					{ text: '渲染特征（Features）', link: '/docs/rendering/feature' },
					{ text: '客户端粒子（Client Particles）', link: '/docs/rendering/particles' },
					{ text: '屏幕（Screens）', link: '/docs/rendering/screens' },
				],
			},
			{
				text: '高级主题（Advanced Topics）',
				collapsed: true,
				items: [
					{ text: '访问转换器（Access Transformers）', link: '/docs/advanced/accesstransformers' },
					{ text: '可扩展枚举（Extensible Enums）', link: '/docs/advanced/extensibleenums' },
					{ text: '功能标志（Feature Flags）', link: '/docs/advanced/featureflags' },
				],
			},
			{
				text: '其他（Miscellaneous）',
				collapsed: true,
				items: [
					{ text: '配置（Configuration）', link: '/docs/misc/config' },
					{ text: '调试分析器（Debug Profiler）', link: '/docs/misc/debugprofiler' },
					{ text: '游戏测试（Game Tests）', link: '/docs/misc/gametest' },
					{ text: '标识符（Identifiers）', link: '/docs/misc/identifier' },
					{ text: '按键映射（Key Mappings）', link: '/docs/misc/keymappings' },
					{ text: 'NeoForge 更新检查器（Update Checker）', link: '/docs/misc/updatechecker' },
				],
			},
		],
		socialLinks: [{ icon: 'github', link: 'https://github.com/VioletAyatan/MC-doc' }],
	},
	markdown: {
		config(md) {
			const defaultFence = md.renderer.rules.fence!;

			md.renderer.rules.fence = (tokens, idx, options, env, self) => {
				const token = tokens[idx];

				// ```mermaid 后面的 mermaid
				const language = token.info.trim().split(/\s+/)[0];

				// 普通代码块继续交给 VitePress / Shiki 处理
				if (language !== 'mermaid') {
					return defaultFence(tokens, idx, options, env, self);
				}

				// 防止 Mermaid 内容中的引号、换行破坏 Vue 属性
				const code = encodeURIComponent(token.content);

				return `<MermaidDiagram code="${code}" />`;
			};
		},
	},
});
