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
		},
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: '首页', link: '/' },
			{ text: '文档', link: '/docs/gettingstarted/index' },
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
					{ text: '注册表', link: '/docs/concepts/registries' },
					{ text: '端', link: '/docs/concepts/sides' },
					{ text: '事件机制', link: '/docs/concepts/events' },
				],
			},
			{
				text: '方块',
				link: '/docs/blocks/index',
				collapsed: true,
				items: [{ text: '方块状态', link: '/docs/blocks/states' }],
			},
			{
				text: '物品',
				link: '/docs/items/index',
				collapsed: true,
				items: [
					{ text: '交互', link: '/docs/items/interactions' },
					{ text: '数据组件', link: '/docs/items/datacomponents' },
					{ text: '消耗品', link: '/docs/items/consumables' },
					{ text: '工具', link: '/docs/items/tools' },
					{ text: '盔甲', link: '/docs/items/armor' },
					{ text: '生物效果与药水', link: '/docs/items/mobeffects' },
				],
			},
			{
				text: '实体',
				link: '/docs/entities/index',
				collapsed: true,
				items: [
					{ text: '数据与网络', link: '/docs/entities/data' },
					{
						text: '生命实体、生物、玩家',
						link: '/docs/entities/livingentity',
					},
					{ text: '属性', link: '/docs/entities/attributes' },
					{ text: '实体渲染器', link: '/docs/entities/renderer' },
				],
			},
			{
				text: '方块实体',
				link: '/docs/blockentities/index',
				collapsed: true,
				items: [{ text: '方块实体渲染器', link: '/docs/blockentities/ber' }],
			},
			{
				text: '资源',
				link: '/docs/resources/index',
				collapsed: true,
				items: [
					{ text: '资源元数据', link: '/docs/resources/metadata' },
					{
						text: '客户端',
						collapsed: true,
						items: [
							{
								text: '国际化与本地化',
								link: '/docs/resources/client/i18n',
							},
							{
								text: '模型',
								link: '/docs/resources/client/models/index',
								collapsed: true,
								items: [
									{ text: '模型数据生成', link: '/docs/resources/client/models/datagen' },
									{ text: '客户端物品', link: '/docs/resources/client/models/items' },
									{ text: '自定义模型加载器', link: '/docs/resources/client/models/modelloaders' },
									{ text: '理解模型系统', link: '/docs/resources/client/models/modelsystem' },
								],
							},
							{
								text: '粒子',
								link: '/docs/resources/client/particles',
							},
							{
								text: '音效',
								link: '/docs/resources/client/sounds',
							},
							{
								text: '纹理',
								link: '/docs/resources/client/textures',
							},
						],
					},
					{
						text: '服务端',
						collapsed: true,
						items: [
							{ text: '成就', link: '/docs/resources/server/advancements' },
							{
								text: '数据加载条件',
								link: '/docs/resources/server/conditions',
							},
							{
								text: '伤害类型与伤害来源',
								link: '/docs/resources/server/damagetypes',
							},
							{
								text: '数据映射',
								link: '/docs/resources/server/datamaps/index',
								collapsed: true,
								items: [{ text: '内置数据映射', link: '/docs/resources/server/datamaps/builtin' }],
							},
							{
								text: '附魔',
								link: '/docs/resources/server/enchantments/index',
								collapsed: true,
								items: [
									{ text: '内置附魔效果组件', link: '/docs/resources/server/enchantments/builtin' },
								],
							},
							{
								text: '战利品表',
								link: '/docs/resources/server/loottables/index',
								collapsed: true,
								items: [
									{ text: '自定义战利品对象', link: '/docs/resources/server/loottables/custom' },
									{ text: '全局战利品修改器', link: '/docs/resources/server/loottables/glm' },
									{ text: '战利品条件', link: '/docs/resources/server/loottables/lootconditions' },
									{ text: '战利品函数', link: '/docs/resources/server/loottables/lootfunctions' },
								],
							},
							{
								text: '配方',
								link: '/docs/resources/server/recipes/index',
								collapsed: true,
								items: [
									{
										text: '内置配方类型',
										link: '/docs/resources/server/recipes/builtin',
									},
									{
										text: '自定义配方',
										link: '/docs/resources/server/recipes/custom',
									},
									{
										text: '原料',
										link: '/docs/resources/server/recipes/ingredients',
									},
								],
							},
							{
								text: '标签',
								link: '/docs/resources/server/tags',
							},
						],
					},
				],
			},
			{
				text: '资源存储与转移',
				collapsed: true,
				items: [
					{ text: '容器', link: '/docs/inventories/container' },
					{ text: '能力', link: '/docs/inventories/capabilities' },
					{ text: '菜单', link: '/docs/inventories/menus' },
					{ text: '事务', link: '/docs/inventories/transactions' },
				],
			},
			{
				text: '数据存储',
				collapsed: true,
				items: [
					{ text: '命名二进制标签', link: '/docs/datastorage/nbt' },
					{ text: '编解码器', link: '/docs/datastorage/codecs' },
					{ text: '值输入输出', link: '/docs/datastorage/valueio' },
					{ text: '数据附件', link: '/docs/datastorage/attachments' },
					{ text: '数据存档', link: '/docs/datastorage/saveddata' },
				],
			},
			{
				text: '世界生成',
				collapsed: true,
				items: [
					{ text: '生物群系修饰符', link: '/docs/worldgen/biomemodifier' },
				],
			},
			{
				text: '网络通讯',
				collapsed: true,
				link: '/docs/networking/index',
				items: [
					{ text: '注册Payload', link: '/docs/networking/payload' },
					{ text: '流编解码器', link: '/docs/networking/streamcodecs' },
					{
						text: '使用配置任务',
						link: '/docs/networking/configuration-tasks',
					},
				],
			},
			{
				text: '渲染',
				collapsed: true,
				items: [
					{ text: '渲染特征', link: '/docs/rendering/feature' },
					{ text: '客户端粒子', link: '/docs/rendering/particles' },
					{ text: '屏幕', link: '/docs/rendering/screens' },
				],
			},
			{
				text: '高级主题',
				collapsed: true,
				items: [
					{ text: '访问转换器', link: '/docs/advanced/accesstransformers' },
					{ text: '可扩展枚举', link: '/docs/advanced/extensibleenums' },
					{ text: '功能标志', link: '/docs/advanced/featureflags' },
				],
			},
			{
				text: '其他',
				collapsed: true,
				items: [
					{ text: '配置', link: '/docs/misc/config' },
					{ text: '调试分析器', link: '/docs/misc/debugprofiler' },
					{ text: '游戏测试', link: '/docs/misc/gametest' },
					{ text: '标识符', link: '/docs/misc/identifier' },
					{ text: '按键映射', link: '/docs/misc/keymappings' },
					{ text: 'NeoForge 更新检查器', link: '/docs/misc/updatechecker' },
				],
			},
		],
		socialLinks: [{ icon: 'github', link: 'https://github.com/VioletAyatan/MC-doc' }],
	},
});
