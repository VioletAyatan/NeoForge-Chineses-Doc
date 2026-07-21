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
| registry | 注册表 | registry（普通说明文字中） | 一般概念使用"注册表"；代码中的 `Registry` 类名和 `BuiltInRegistries` 等标识符保持原文。 |
| registry name | 注册名 | registry name（普通说明文字中） | 每个注册项对应的唯一名称。代码键 `registryName` 等保持原文。 |
| registry entry | 注册项 | registry entry（普通说明文字中） | registry 中存储的已注册对象。 |
| datapack registry | 数据包注册表 | datapack registry（普通说明文字中） | 从数据包 JSON 加载内容的特殊注册表。代码中的 `DataPackRegistryEvent` 等标识符保持原文。 |
| dynamic registry | 动态注册表 | dynamic registry（普通说明文字中） | datapack registry 的别称，强调其运行时加载特性。 |
| registry key | 注册表键（registry key） | registry key（普通说明文字中） | 用于标识一个注册表的 `ResourceKey`。代码中保持 `ResourceKey`、`RegistryKey`。 |
| identifier | 标识符 | Identifier（普通说明文字中） | 泛指 `Identifier` 类所表示的资源标识符。类名 `Identifier`、`ResourceLocation` 在代码中保持原文。 |
| namespace | 命名空间 | namespace（普通说明文字中） | Identifier 中 `:` 前的部分，表示所属模组或 Minecraft。代码键 `namespace` 保持原文。 |
| data pack | 数据包 | data pack（普通说明文字中） | 存放服务端数据文件的包。`Datapack` 等代码标识符保持原文。 |
| data generation / datagen | 数据生成（datagen） | 数据生成器 | NeoForge 的数据文件自动生成系统。代码中 `GatherDataEvent`、`datagen` 保持原文。 |
| data provider | 数据提供器 | data provider（普通说明文字中） | 数据生成系统中负责为特定数据类型生成文件的类。`DataProvider` 类名保持原文。 |

## Java 语言术语

| 英文原词 | 推荐译名 | 避免使用 | 说明 |
| --- | --- | --- | --- |
| class / abstract class | 类 / 抽象类 | class、abstract class（普通说明文字中） | Java 类及抽象类概念。类名、`.class` 文件名及代码中的 `class`、`abstract` 关键字保持原文。 |
| superclass / subclass | 超类 / 子类 | superclass、subclass | 描述类的继承关系；类名和 `extends` 等代码保持原文。 |
| interface / sub-interface | 接口 / 子接口 | interface、sub-interface | Java 接口概念；接口名和代码中的 `interface` 关键字保持原文。 |
| record | record | 记录（作为 Java 类型术语时） | Java record 类型在普通说明文字中保留英文；record 类名和代码中的 `record` 关键字同样保持原文。 |
| constructor | 构造器 | constructor | 创建类或 record 实例的特殊成员。具体构造器签名保持原文。 |
| method | 方法 | method | Java 方法概念；方法名与方法引用保持原文。 |
| field | 字段 | field | Java 字段概念；字段名保持原文。 |
| enum | 枚举 | enum、Enum（普通说明文字中） | Java 枚举概念；枚举类名、枚举常量和代码中的 `enum` 关键字保持原文。 |
| annotation | 注解 | annotation | Java 注解概念；具体注解名保持原文。 |
| override / overload | 重写 / 重载 | override、overload | 分别指重新实现继承方法与提供同名不同参数的方法；代码标识和 `@Override` 保持原文。 |
| generic | 泛型 | generic | Java 泛型概念；类型参数和泛型签名保持原文。 |
| instance / object | 实例 / 对象 | instance、object（普通说明文字中） | 普通 Java 概念；特定规范名称中的 `Object` 是否翻译需按上下文判断。 |
| function / callback | 函数 / 回调 | function、callback | 普通说明文字中的可调用逻辑；`Function` 等接口名保持原文。 |
| property | property | 属性（作为 Java 或 Minecraft Property 术语时） | Java property 以及 Minecraft 的 BlockState、Item Model 等 Property 概念均保留英文，避免与普通描述性属性混淆；`Property` 类及具体 property 名同样保持原文。 |
| builder | builder | 构建器 | 指 Builder 模式中的构建对象，普通说明文字也保留英文；`Builder` 类名及具体方法名保持原文。 |
| handler / listener | 处理器 / 监听器 | handler、listener | 普通说明文字中的处理或监听对象；具体类型名保持原文。 |
| getter / setter | getter / setter | 取值方法 / 设值方法（作为 Java 术语时） | 分别指读取和设置值的方法，普通说明文字保留英文；具体方法名保持原文。 |
| lambda expression | Lambda 表达式 | lambda expression | Java Lambda 表达式概念；示例代码保持原文。 |
| package / variable / compiler | 包 / 变量 / 编译器 | package、variable、compiler | 普通说明文字中的 Java 基础概念；包名、变量名和代码关键字保持原文。 |

## 易混概念

- **成就条件与加载条件不同**：`criteria` 用于判定成就是否完成；`neoforge:conditions` 用于决定数据加载时是否加载该成就。
- **触发条件不等于完成成就**：触发器使某个条件得到检查并可能满足；只有 `requirements` 定义的条件组合全部满足后，成就才算完成。
- **显示类型不改变完成逻辑**：`task`、`goal` 和 `challenge` 主要决定成就的边框与展示方式，不改变条件触发和完成判定机制。
