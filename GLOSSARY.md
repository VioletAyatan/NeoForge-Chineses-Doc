# 项目术语表

本文档记录本项目统一采用的游戏术语和翻译边界，供译者、审校者及 Agent 在处理文档时查阅。新增或校正术语时，请同步补充本表。

## 使用规则

- 普通说明文字统一使用“推荐译名”。
- 行内代码、代码块、类名、方法名、字段名、注册表键、资源路径、命令和配置键保持原文，不因术语统一而改写。
- 同一概念在标题、链接文本、图表和正文中使用相同译名；如需保留英文，首次出现时可写作“推荐译名（英文原词）”。
- “避免使用”列仅约束对应英文概念的译名，不禁止这些中文词在表达其他概念时正常使用。

## Minecraft 游戏术语

| 英文原词 | 推荐译名 | 避免使用 | 说明 |
| --- | --- | --- | --- |
| Advancement | 成就 | 进度、进阶 | 泛指 JSON 成就、成就界面中的条目及相关玩法机制。代码标识 `Advancement`、资源目录 `advancement`、翻译键 `advancements.*` 等保持原文。 |
| advancement tree | 成就树 | 进度树 | 由根成就及其子成就构成的树状结构。 |
| advancement tab | 成就选项卡 | 进度选项卡 | 成就界面中承载一棵或多棵成就树的选项卡。 |
| root advancement | 根成就 | 根进度 | 未设置父成就的成就，是成就树的根。 |
| child advancement | 子成就 | 子进度 | 将另一个成就的 ID 指定为 `parent` 的成就。 |
| criterion / criteria | 条件 | 判据、成就进度 | `criteria` 定义完成成就时跟踪的条件；条件由触发器判定是否满足。不要把“条件被触发”与“成就已完成”混为一谈。 |
| criterion trigger | 条件触发器 | 成就触发器 | 触发器响应游戏行为并检查相应条件；满足条件后，游戏再依据 `requirements` 判断整个成就是否完成。 |
| requirements | 条件组合规则 | 成就要求 | 定义 `criteria` 中各条件的 AND/OR 组合关系，不是另一组条件。代码键 `requirements` 保持原文。 |
| advancement reward | 成就奖励 | 进度奖励 | 成就完成后发放的经验、配方、战利品或执行的函数。 |
| `task` / `goal` / `challenge` | 任务型 / 目标型 / 挑战型 | 任务 / 目标 / 挑战（作为独立系统名称时） | 三者是 `frame` 的成就显示类型，不是三套不同的成就系统；JSON 值保持英文。 |

## NeoForge 技术术语

| 英文原词 | 推荐译名 | 避免使用 | 说明 |
| --- | --- | --- | --- |
| Event | 事件 | Event（普通说明文字中） | 泛指事件机制中的事件。Java 类型名 `Event`、以 `Event` 结尾的类名及其他代码标识符保持原文。 |
| event handler | 事件处理器 | Event handler | 监听事件并执行相应行为的方法；`EventHandler` 等类名保持原文。 |
| event bus | 事件总线 | event bus、Event bus | 发布和订阅事件的总线。`IEventBus`、`NeoForge.EVENT_BUS` 等代码标识符保持原文；可派生为“游戏事件总线”“模组事件总线”。 |
| Data Component | 数据组件 | Data Component（普通说明文字中） | 泛指 Item 等对象携带的数据组件。`DataComponentType`、`DataComponents` 等类名和代码标识符保持原文。 |
| Damage Type | 伤害类型 | Damage Type（普通说明文字中） | 表示伤害类别的数据驱动定义。Java 类型名 `DamageType`、标签和资源路径保持原文。 |
| Damage Source | 伤害来源 | Damage Source（普通说明文字中） | 表示一次具体伤害及其上下文。Java 类型名 `DamageSource` 保持原文。 |
| Biome Modifier | 生物群系修饰符 | Biome Modifier（普通说明文字中） | 指 NeoForge 的数据驱动生物群系修改机制。接口名 `BiomeModifier`、registry 和资源路径保持原文。 |
| Stream Codec | 流编解码器 | Stream Codec（普通说明文字中） | 指用于网络流编码与解码的编解码器。类名 `StreamCodec` 及相关字段名保持原文。 |
| Loot Table | 战利品表 | Loot Table（普通说明文字中） | 指用于生成战利品的数据文件与机制。类名 `LootTable`、JSON 键和资源路径保持原文。 |
| Armor | 盔甲 | Armor（普通说明文字中） | 泛指角色穿戴的盔甲及其模型、槽位等概念。`ArmorItem`、`ArmorMaterial` 等类名和代码标识符保持原文。 |

## 易混概念

- **成就条件与加载条件不同**：`criteria` 用于判定成就是否完成；`neoforge:conditions` 用于决定数据加载时是否加载该成就。
- **触发条件不等于完成成就**：触发器使某个条件得到检查并可能满足；只有 `requirements` 定义的条件组合全部满足后，成就才算完成。
- **显示类型不改变完成逻辑**：`task`、`goal` 和 `challenge` 主要决定成就的边框与展示方式，不改变条件触发和完成判定机制。
