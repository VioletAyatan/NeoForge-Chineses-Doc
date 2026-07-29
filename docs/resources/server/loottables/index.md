# 战利品表（Loot Tables）

战利品表是用于定义随机战利品掉落的数据文件。抽取战利品表会返回一个可能为空的物品堆叠列表，其输出取决于（伪）随机性。战利品表位于 `data/<mod_id>/loot_table/<name>.json`。例如，泥土方块使用的战利品表 `minecraft:blocks/dirt` 位于 `data/minecraft/loot_table/blocks/dirt.json`。

Minecraft 在游戏中的许多位置使用战利品表，包括[方块][block]掉落、[实体][entity]掉落、箱子战利品、钓鱼战利品等。战利品表的引用方式取决于上下文：

- 默认情况下，每个方块都会获得一个位于 `<block_namespace>:blocks/<block_name>` 的关联战利品表。可以在方块的 `Properties` 上调用 `#noLootTable` 将其禁用，这样不会创建战利品表，方块也不会掉落任何内容；此做法主要用于空气类或技术型方块。
- 默认情况下，所有未调用 `EntityType.Builder#noLootTable` 的实体（通常是 `MobCategory#MISC` 中的实体）都会获得一个位于 `<entity_namespace>:entities/<entity_name>` 的关联战利品表。可以通过重写 `#getLootTable` 更改它。例如，绵羊会根据羊毛颜色抽取不同战利品表。
- 结构中的箱子会在方块实体数据中指定战利品表。Minecraft 将所有箱子战利品表存放在 `minecraft:chests/<chest_name>`；建议模组遵循这一做法，但并非强制。
- 袭击结束后村民可能投给玩家的礼物物品，其战利品表定义在 [`neoforge:raid_hero_gifts` 数据映射][raidherogifts] 中。
- 其他战利品表（例如钓鱼战利品表）会在需要时从 `level.getServer().reloadableRegistries().getLootTable(lootTableKey)` 获取。所有原版战利品表位置的列表可在 `BuiltInLootTables` 中找到。

:::warning
通常只应为属于自己模组的内容创建战利品表。修改现有战利品表时，应改用[全局战利品修改器（GLM）][glm]。
:::

由于战利品表系统较为复杂，它由多个用途不同的子系统组成。

## 战利品条目

战利品条目（或战利品池条目）在代码中由抽象类 `LootPoolEntryContainer` 表示，是单个战利品元素。它可以指定一个或多个待掉落物品。

战利品条目通常分为两组：单例（公共超类为 `LootPoolSingletonContainer`）与复合条目（公共超类为 `CompositeEntryBase`）；复合条目由多个单例组成。Minecraft 提供以下单例类型：

- `minecraft:empty`：空战利品条目，表示没有物品。在代码中调用 `EmptyLootItem#emptyItem` 创建。
- `minecraft:item`：单个战利品物品条目，抽取时掉落指定物品。在代码中以所需物品调用 `LootItem#lootTableItem` 创建。
    - 可以使用战利品函数设置物品堆叠数量、数据组件等。
- `minecraft:tag`：标签条目，抽取时掉落指定标签中的所有物品。它有两个变体，取决于布尔属性 `expand` 的值。如果 `expand` 为 true，会为标签中的每个物品生成独立条目；否则使用一个条目掉落所有物品。分别以物品[标签键][tags]参数调用 `TagEntry#tagContents`（`expand=false`）或 `TagEntry#expandTag`（`expand=true`）创建。
    - 例如，如果 `expand` 为 true 且标签为 `#minecraft:planks`，则每种木板都会生成一个条目（11 种原版木板对应 11 个条目，外加每种模组木板各一个条目），每个条目都具有指定权重、品质和函数；如果 `expand` 为 false，则使用一个能够掉落所有木板的条目。
- `minecraft:slots`：引用任意物品栏槽位（例如实体、物品等）的战利品条目。`minecraft:slot_range` 来源可用于定位实体和方块实体；`minecraft:contents` 可用于定位带有基于内容的数据组件，且定义并注册了 `ContainerComponentManipulator` 的物品。
- `minecraft:dynamic`：引用动态掉落的战利品条目。动态掉落用于向战利品表添加无法预先指定、只能在代码中加入的条目。动态掉落条目由 id 与实际添加物品的 `Consumer<ItemStack>` 组成。要添加动态掉落条目，请以所需 id 指定 `minecraft:dynamic` 条目，再在[战利品上下文][context]中添加对应 Consumer。使用 `DynamicLoot#dynamicEntry` 创建。
- `minecraft:loot_table`：抽取另一个战利品表，并将其结果作为单个条目添加。另一个战利品表既可通过 id 指定，也可完整内联。在代码中，以 `Identifier` 参数调用 `NestedLootTable#lootTableReference`，或针对内联战利品表以 `LootTable` 对象参数调用 `NestedLootTable#inlineLootTable` 创建。

Minecraft 提供以下复合类型：

- `minecraft:group`：包含其他战利品条目列表，并按顺序运行的战利品条目。在代码中以其他战利品条目 builder 调用 `EntryGroup#list`，或在另一个 `LootPoolSingletonContainer.Builder` 上调用 `#append` 创建。
- `minecraft:sequence`：与 `minecraft:group` 类似，但任一子条目失败后会立即停止运行，并丢弃其后的所有条目。在代码中以其他战利品条目 builder 调用 `SequentialEntry#sequential`，或在另一个 `LootPoolSingletonContainer.Builder` 上调用 `#then` 创建。
- `minecraft:alternatives`：某种意义上与 `minecraft:sequence` 相反；任一子条目成功后（而不是失败后）会立即停止运行，并丢弃其后的所有条目。在代码中以其他战利品条目 builder 调用 `AlternativesEntry#alternatives`，或在另一个 `LootPoolSingletonContainer.Builder` 上调用 `#otherwise` 创建。

通过公共超类 `LootPoolEntryContainer`，这些条目都具有 `conditions` 属性，用于提供要应用到该战利品条目的[战利品条件][lootcondition]列表。只要一个条件失败，就会将该条目视为不存在。

扩展 `LootPoolSingletonContainer` 的单例还具有：

- `weight`：权重值，默认为 1。用于让某些物品比其他物品更常见。例如，有两个战利品条目，一个权重为 3，另一个权重为 1，则第一个条目有 75% 的概率被选中，第二个为 25%。
- `quality`：品质值，默认为 0。如果非零，则在抽取战利品表时，将该值乘以幸运值（在[战利品上下文][context]中设置），再加到权重上。
- `functions`：要应用到该战利品条目输出的[战利品函数][lootfunction]列表。

mod 开发者也可以定义[自定义战利品条目类型][customentry]。

## 战利品池

战利品池本质上是战利品条目列表。战利品表可以包含多个战利品池，各池会彼此独立地进行抽取。

战利品池可以包含以下内容：

- `entries`：战利品条目列表。
- `conditions`：要应用到该战利品池的[战利品条件][lootcondition]列表。只要一个条件失败，就不会抽取池中的任何条目。
- `functions`：要应用到该战利品池所有战利品条目输出的[战利品函数][lootfunction]列表。
- `rolls` 与 `bonus_rolls`：两个数值提供器（见下文），共同决定该战利品池的抽取次数。公式为 `rolls + bonus_rolls * luck`，其中 luck 值在[战利品参数][parameters]中设置。
- `name`：战利品池名称，由 NeoForge 添加，可供 [GLM][glm] 使用。若未指定，则使用加有 `custom#` 前缀的战利品池哈希码。

## 数值提供器

数值提供器用于在数据包上下文中获取（伪）随机数。它主要供战利品表使用，也用于世界生成等其他上下文。原版提供以下数值提供器：

- `minecraft:constant`：常量浮点数值，在需要时舍入为整数。通过 `ConstantValue#exactly` 创建。
- `minecraft:uniform`：均匀分布的随机整数或浮点数值，设有最小值和最大值。最小值与最大值之间的所有值出现概率相同。通过 `UniformGenerator#between` 创建。
- `minecraft:binomial`：二项分布的随机整数值，设有 n 和 p。有关这些值的含义，更多信息请参阅[二项分布][binomial]。通过 `BinomialDistributionGenerator#binomial` 创建。
- `minecraft:score`：给定目标实体、分数名称及可选缩放值，获取目标实体的指定记分板值，并乘以给定缩放值（若有）。通过 `ScoreboardValue#fromScoreboard` 创建。
- `minecraft:storage`：给定 NBT 路径处命令存储中的值。通过 `new StorageValue` 创建。
- `minecraft:sum`：将其他数值提供器的值相加。通过 `new Sum` 创建。
- `minecraft:enchantment_level`：为每个附魔等级提供值。通过 `EnchantmentLevelProvider#forEnchantmentLevel` 创建，并提供一个 `LevelBasedValue`。有效的 `LevelBasedValue` 包括：
    - 不指定类型的简单常量值。通过 `LevelBasedValue#constant` 创建。
    - `minecraft:linear`：每个附魔等级线性增长的值，外加可选常量基础值。通过 `LevelBasedValue#perLevel` 创建。
    - `minecraft:levels_squared`：将附魔值平方，再加上可选基础值。通过 `new LevelBasedValue.LevelsSquared` 创建。
    - `minecraft:fraction`：接收另外两个 `LevelBasedValue`，用它们构造分数。通过 `new LevelBasedValue.Fraction` 创建。
    - `minecraft:clamped`：接收另一个 `LevelBasedValue` 以及最小值与最大值。使用另一个 `LevelBasedValue` 计算数值并限制结果。通过 `new LevelBasedValue.Clamped` 创建。
    - `minecraft:exponent`：接收另外两个 `LevelBasedValue`，计算第一个值的第二个值次幂。通过 `new LevelBasedValue.Exponent` 创建。
    - `minecraft:lookup`：接收 `List<Float>` 与备用 `LevelBasedValue`。在列表中查找要使用的值（等级 1 对应第一个元素，等级 2 对应第二个元素，依此类推）；如果缺少某等级的值，则使用备用值。通过 `LevelBasedValue#lookup` 创建。
- `minecraft:environment_attribute`：获取当前位置或维度中环境属性的数值。通过 `new EnvironmentAttributeValue` 创建。

mod 开发者还可以按需注册[自定义数值提供器][customnumber]与[自定义基于等级的值][customlevelbased]。

## 战利品参数

战利品参数在内部称为 `ContextKey<T>`，是在抽取战利品表时提供给它的参数，其中 `T` 是所提供参数的类型，例如 `BlockPos` 或 `Entity`。它们可供[战利品条件][lootcondition]与[战利品函数][lootfunction]使用。例如，`minecraft:killed_by_player` 战利品条件会检查是否存在 `minecraft:player` 参数。

Minecraft 提供以下战利品参数：

- `minecraft:this_entity`：与战利品表关联的实体，通常是被击杀的实体。通过 `LootContextParams.THIS_ENTITY` 访问。
- `minecraft:interacting_entity`：与战利品表交互的实体，例如挖掘方块的玩家。通过 `LootContextParams.INTERACTING_ENTITY` 访问。
- `minecraft:target_entity`：与战利品表关联的实体，通常是某种交互的目标。通过 `LootContextParams.TARGET_ENTITY` 访问。
- `minecraft:last_damage_player`：与战利品表关联的玩家，通常是最后攻击被击杀实体的玩家，即使该玩家是间接击杀（例如玩家轻击实体，之后它被尖刺杀死）。用于仅限玩家击杀时掉落等场景。通过 `LootContextParams.LAST_DAMAGE_PLAYER` 访问。
- `minecraft:damage_source`：与战利品表关联的[伤害来源][damagesource]，通常是击杀实体的伤害来源。通过 `LootContextParams.DAMAGE_SOURCE` 访问。
- `minecraft:attacking_entity`：与战利品表关联的攻击实体，通常是击杀该实体的对象。通过 `LootContextParams.ATTACKING_ENTITY` 访问。
- `minecraft:direct_attacking_entity`：与战利品表关联的直接攻击实体。例如，如果攻击实体是骷髅，则直接攻击实体是箭。通过 `LootContextParams.DIRECT_ATTACKING_ENTITY` 访问。
- `minecraft:origin`：与战利品表关联的位置，例如战利品箱的位置。通过 `LootContextParams.ORIGIN` 访问。
- `minecraft:block_state`：与战利品表关联的方块状态，例如被破坏的方块状态。通过 `LootContextParams.BLOCK_STATE` 访问。
- `minecraft:block_entity`：与战利品表关联的方块实体，例如与被破坏方块关联的方块实体。潜影盒会用它将物品栏保存到掉落物品中。通过 `LootContextParams.BLOCK_ENTITY` 访问。
- `minecraft:tool`：与战利品表关联的物品实例，例如用于破坏方块的物品。它不一定是工具。通过 `LootContextParams.TOOL` 访问。
- `minecraft:explosion_radius`：当前上下文中的爆炸半径，主要用于向掉落物应用爆炸衰减。通过 `LootContextParams.EXPLOSION_RADIUS` 访问。
- `minecraft:enchantment_level`：附魔等级，供附魔逻辑使用。通过 `LootContextParams.ENCHANTMENT_LEVEL` 访问。
- `minecraft:enchantment_active`：所用物品是否带有附魔，例如用于精准采集检查。通过 `LootContextParams.ENCHANTMENT_ACTIVE` 访问。
- `minecraft:additional_cost_component_allowed`：如果交易元数据需要，允许村民交易产生额外费用。

可以用所需 id 调用 `new ContextKey<T>` 创建自定义战利品参数。由于它们只是资源位置包装器，因此无需注册。

### 目标实体

目标实体是战利品条件与函数中使用的类型，在代码中由 `LootContext.EntityTarget` 枚举表示。它们用于指定在条件或函数上下文中查询哪个实体战利品参数。有效值包括：

- `"this"` 或 `LootContext.EntityTarget.THIS`：表示 `"minecraft:this_entity"` 参数。
- `"attacker"` 或 `LootContext.EntityTarget.ATTACKER`：表示 `"minecraft:attacking_entity"` 参数。
- `"direct_attacker"` 或 `LootContext.EntityTarget.DIRECT_ATTACKER`：表示 `"minecraft:direct_attacking_entity"` 参数。
- `"attacking_player"` 或 `LootContext.EntityTarget.ATTACKING_PLAYER`：表示 `"minecraft:last_damage_player"` 参数。
- `"target_entity"` 或 `LootContext.EntityTarget.TARGET_ENTITY`：表示 `"minecraft:target_entity"` 参数。
- `"interacting_entity"` 或 `LootContext.EntityTarget.INTERACTING_ENTITY`：表示 `"minecraft:interacting_entity"` 参数。

例如，`minecraft:entity_properties` 战利品条件接受一个目标实体；如果战利品表作者需要，就可以检查所有这些战利品参数。

### 战利品参数集

战利品参数集也称为战利品表类型，在代码中称为 `ContextKeySet`，是必需与可选战利品参数的集合。尽管名称如此，它们并不是 `Set`（甚至不是 `Collection`），而是对两个 `Set<ContextKey<?>>` 的包装：一个保存必需参数（`#required`），另一个保存可选参数（`#allowed`）。它们用于验证战利品参数的使用者只使用预期可用的参数，并验证抽取战利品表时所有必需参数均已存在。此外，成就与附魔逻辑也会使用它们。

原版提供以下战利品参数集（必需参数以**粗体**显示，可选参数以_斜体_显示；代码中的名称是 `LootContextParamSets` 内的常量）：

| ID                               | 代码中的名称           | 指定的战利品参数                                                                                                                                                                                                                                                                                                     | 用途                                                      |
|----------------------------------|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| `minecraft:empty`                | `EMPTY`                | 不适用                                                                                                                                                                                                                                                                                                               | 备用用途。                                                |
| `minecraft:generic`              | `ALL_PARAMS`           | **`minecraft:origin`**, **`minecraft:tool`**, **`minecraft:block_state`**, **`minecraft:block_entity`**, **`minecraft:explosion_radius`**, **`minecraft:this_entity`**, **`minecraft:damage_source`**, **`minecraft:attacking_entity`**, **`minecraft:direct_attacking_entity`**, **`minecraft:last_damage_player`** | 验证。                                                    |
| `minecraft:command`              | `COMMAND`              | **`minecraft:origin`**, _`minecraft:this_entity`_                                                                                                                                                                                                                                                                    | 命令。                                                    |
| `minecraft:selector`             | `SELECTOR`             | **`minecraft:origin`**, _`minecraft:this_entity`_                                                                                                                                                                                                                                                                    | 命令中的实体选择器。                                  |
| `minecraft:villager_trade`       | `VILLAGER_TRADE`       | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:additional_cost_component_allowed`**,                                                                                                                                                                                                             | 村民交易。                                                |
| `minecraft:block`                | `BLOCK`                | **`minecraft:origin`**, **`minecraft:tool`**, **`minecraft:block_state`**, _`minecraft:block_entity`_, _`minecraft:explosion_radius`_, _`minecraft:this_entity`_                                                                                                                                                     | 破坏方块。                                              |
| `minecraft:block_use`            | `BLOCK_USE`            | **`minecraft:origin`**, **`minecraft:block_state`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                     | 原版未使用。                                              |
| `minecraft:block_interact`       | `BLOCK_INTERACT`       | **`minecraft:block_state`**, _`minecraft:block_entity`_, _`minecraft:interacting_entity`_, _`minecraft:tool`_                                                                                                                                                                                                       | 方块交互。                                              |
| `minecraft:hit_block`            | `HIT_BLOCK`            | **`minecraft:origin`**, **`minecraft:enchantment_level`**, **`minecraft:block_state`**, **`minecraft:this_entity`**                                                                                                                                                                                                  | 引雷附魔。                                                |
| `minecraft:chest`                | `CHEST`                | **`minecraft:origin`**, _`minecraft:this_entity`_, _`minecraft:attacking_entity`_                                                                                                                                                                                                                                    | 战利品箱及类似容器、运输战利品箱的矿车。                  |
| `minecraft:archaeology`          | `ARCHAEOLOGY`          | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:tool`**                                                                                                                                                                                                                                            | 考古。                                                    |
| `minecraft:vault`                | `VAULT`                | **`minecraft:origin`**, _`minecraft:this_entity`_, _`minecraft:tool`_                                                                                                                                                                                                                                                | 试炼密室宝库奖励。                                        |
| `minecraft:entity`               | `ENTITY`               | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:damage_source`**, _`minecraft:attacking_entity`_, _`minecraft:direct_attacking_entity`_, _`minecraft:last_damage_player`_                                                                                                                          | 实体击杀。                                             |
| `minecraft:entity_interact`      | `ENTITY_INTERACT`      | **`minecraft:target_entity`**, **`minecraft:tool`**, _`minecraft:interacting_entity`_                                                                                                                                                                                                                                | 实体交互。                                             |
| `minecraft:shearing`             | `SHEARING`             | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:tool`**                                                                                                                                                                                                                                            | 剪取实体，例如绵羊。                                   |
| `minecraft:equipment`            | `EQUIPMENT`            | **`minecraft:origin`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                                                  | 实体装备，例如僵尸装备。                                |
| `minecraft:gift`                 | `GIFT`                 | **`minecraft:origin`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                                                  | 袭击英雄礼物。                                            |
| `minecraft:barter`               | `PIGLIN_BARTER`        | **`minecraft:this_entity`**                                                                                                                                                                                                                                                                                          | 猪灵以物易物。                                            |
| `minecraft:fishing`              | `FISHING`              | **`minecraft:origin`**, **`minecraft:tool`**, _`minecraft:this_entity`_, _`minecraft:attacking_entity`_                                                                                                                                                                                                              | 钓鱼。                                                    |
| `minecraft:enchanted_item`       | `ENCHANTED_ITEM`       | **`minecraft:tool`**, **`minecraft:enchantment_level`**                                                                                                                                                                                                                                                              | 多种附魔。                                                |
| `minecraft:enchanted_entity`     | `ENCHANTED_ENTITY`     | **`minecraft:origin`**, **`minecraft:enchantment_level`**, **`minecraft:this_entity`**                                                                                                                                                                                                                               | 多种附魔。                                                |
| `minecraft:enchanted_damage`     | `ENCHANTED_DAMAGE`     | **`minecraft:origin`**, **`minecraft:enchantment_level`**, **`minecraft:this_entity`**, **`minecraft:damage_source`**, _`minecraft:attacking_entity`_, _`minecraft:direct_attacking_entity`_                                                                                                                         | 伤害与保护类附魔。                                        |
| `minecraft:enchanted_location`   | `ENCHANTED_LOCATION`   | **`minecraft:origin`**, **`minecraft:enchantment_level`**, **`minecraft:enchantment_active`**, **`minecraft:this_entity`**                                                                                                                                                                                           | 冰霜行者与灵魂疾行附魔。                                  |
| `minecraft:advancement_entity`   | `ADVANCEMENT_ENTITY`   | **`minecraft:origin`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                                                  | 多种[成就条件][advancement]。                              |
| `minecraft:advancement_location` | `ADVANCEMENT_LOCATION` | **`minecraft:origin`**, **`minecraft:tool`**, **`minecraft:block_state`**, **`minecraft:this_entity`**                                                                                                                                                                                                               | 多种[条件触发器][advancement]。                            |
| `minecraft:advancement_reward`   | `ADVANCEMENT_REWARD`   | **`minecraft:origin`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                                                  | [成就奖励][advancement]。                                  |

### 战利品上下文

战利品上下文是包含抽取战利品表时情境信息的对象，其中包括：

- 抽取战利品表所在的 `ServerLevel`。通过 `#getLevel` 获取。
- 用于抽取战利品表的 `RandomSource`。通过 `#getRandom` 获取。
- 战利品参数。使用 `#hasParameter` 检查是否存在，使用 `#getParameter` 获取单个参数。
- 幸运值，用于计算额外抽取次数与品质值。通常通过实体的幸运属性填充。通过 `#getLuck` 获取。
- 动态掉落 Consumer。更多信息参见[上文][entry]。通过 `#addDynamicDrops` 设置；没有可用的 getter。

## 战利品表

组合前面的所有元素，最终得到战利品表。战利品表 JSON 可以指定以下值：

- `pools`：战利品池列表。
- `neoforge:conditions`：[数据加载条件][conditions]列表。**警告：这些是数据加载条件，而不是[战利品条件][lootcondition]！**
- `functions`：要应用到该战利品表所有战利品条目输出的[战利品函数][lootfunction]列表。
- `type`：战利品参数集，用于验证战利品参数是否正确使用。可选；若省略，则跳过验证。
- `random_sequence`：该战利品表的随机序列，形式为资源位置。随机序列由 `Level` 提供，用于在相同条件下产生一致的战利品表抽取结果。通常使用战利品表自身的位置。

战利品表示例可采用以下格式：

```json5
{
    "type": "chest", // 战利品参数集
    "neoforge:conditions": [
        // 数据加载条件
    ],
    "functions": [
        // 全表战利品功能
    ],
    "pools": [ // 战利品池列表
        {
            "rolls": 1, // 战利品表的卷数，此处使用 5 将从池中产生 5 个结果
            "bonus_rolls": 0.5, // 奖金卷数
            "name": "my_pool",
            "conditions": [
                // 全池战利品条件
            ],
            "functions": [
                // 池范围的战利品功能
            ],
            "entries": [ // 战利品表条目列表
                {
                    "type": "minecraft:item", // 战利品输入类型
                    "name": "minecraft:dirt", // 类型特定的属性，例如物品的名称
                    "weight": 3, // 条目权重
                    "quality": 1, // 条目质量
                    "conditions": [
                        // 入门级战利品条件
                    ],
                    "functions": [
                        // 入门级战利品功能
                    ]
                }
            ]
        }
    ]
}
```

## 抽取战利品表

抽取战利品表需要两项内容：战利品表本身与战利品上下文。

首先获取战利品表本身。可以使用 `level.getServer().reloadableRegistries().getLootTable(lootTableId)` 获取战利品表。由于战利品数据只能通过服务器获得，因此该逻辑必须在[逻辑服务器][sides]而非逻辑客户端上运行。

:::tip
Minecraft 的内置战利品表 ID 可在 `BuiltInLootTables` 类中找到。方块战利品表可通过 `BlockBehaviour#getLootTable` 获取，实体战利品表可通过 `EntityType#getDefaultLootTable` 或 `Entity#getLootTable` 获取。
:::

有了战利品表后，接下来构建参数集。首先创建 `LootParams.Builder` 实例：

```java
// 确保你在服务器上，否则转换将失败。
LootParams.Builder builder = new LootParams.Builder((ServerLevel) level);
```

随后添加战利品上下文参数：

```java
// 使用你需要的任何上下文参数和值。普通参数可以在 LootContextParams 中找到。
builder.withParameter(LootContextParams.ORIGIN, position);
// 此变体可以接受 null 作为值，在这种情况下，该参数的现有值将被删除。
builder.withOptionalParameter(LootContextParams.ORIGIN, null);
// 添加动态掉落。
builder.withDynamicDrop(Identifier.fromNamespaceAndPath("examplemod", "example_dynamic_drop"), stackAcceptor -> {
    // 这里有一些逻辑
});
// 设置 luck 值。这里假定玩家可用；没有玩家的上下文应使用 0。
builder.withLuck(player.getLuck());
```

最后，从 builder 创建 `LootParams`，并用它抽取战利品表：

```java
// 如果需要，请指定此处设置的战利品上下文参数。
LootParams params = builder.create(LootContextParamSets.EMPTY);
// 获取战利品表。
LootTable table = level.getServer().reloadableRegistries().getLootTable(location);
// 实际抽取战利品表。
List<ItemStack> list = table.getRandomItems(params);
// 如果要为 Container 内容（例如战利品箱）抽取战利品表，请改用此方法。
// 此方法负责在容器中正确分配战利品。
List<ItemStack> containerList = table.fill(container, params, someSeed);
```

:::danger
`LootTable` 还公开了名为 `#getRandomItemsRaw` 的方法。与各种 `#getRandomItems` 变体不同，`#getRandomItemsRaw` 不会应用[全局战利品修改器][glm]。只有在明确了解其影响时才使用此方法。
:::

## 数据生成

可以通过注册 `LootTableProvider`，并在构造器中提供 `LootTableSubProvider` 列表，通过[数据生成][datagen]创建战利品表：

```java
@SubscribeEvent // 位于模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，请先调用 event.createDatapackRegistryObjects(...)

    event.createProvider((output, lookupProvider) -> new LootTableProvider(
        output,
        // 一组所需的表资源位置。这些后来被证实存在。
        // 一般不建议模组验证存在，
        // 因此我们传入一个空集。
        Set.of(),
        // 子提供器条目列表。请参阅下文了解此处使用的值。
        List.of(...),
        // 注册表访问
        lookupProvider
    ));
}
```

### `LootTableSubProvider`

`LootTableSubProvider` 是实际执行生成的位置。首先实现 `LootTableSubProvider` 并重写 `#generate`：

```java
public class MyLootTableSubProvider implements LootTableSubProvider {
    // 该参数由 lambda 提供（见下文）。它可以被存储并用于查找其他注册表项。
    public MyLootTableSubProvider(HolderLookup.Provider lookupProvider) {
        // 将 lookupProvider 存储在字段中
    }

    @Override
    public void generate(BiConsumer<ResourceKey<LootTable>, LootTable.Builder> consumer) {
        // LootTable.lootTable() returns a loot table builder we can add loot tables to.
        consumer.accept(
                ResourceKey.create(
                    Registries.LOOT_TABLE,
                    Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "example_loot_table")
                ),
                LootTable.lootTable()
        // 添加战利品表级战利品函数。此示例使用数值提供器（见下文）。
                .apply(SetItemCountFunction.setCount(ConstantValue.exactly(5)))
                // 添加战利品池。
                .withPool(LootPool.lootPool()
                        // 添加战利品池级别的功能，与上面类似。
                        .apply(...)
                        // 添加战利品池级条件。本例只在下雨时抽取该池。
                        .when(WeatherCheck.weather().setRaining(true))
                        // 分别设置抽取次数与额外抽取次数。
                        // 这两种方法都利用数值提供器。
                        .setRolls(UniformGenerator.between(5, 9))
                        .setBonusRolls(ConstantValue.exactly(1))
                        // 添加战利品条目。此示例返回一个物品战利品条目。有关更多战利品条目，请参阅下文。
                        .add(LootItem.lootTableItem(Items.DIRT))
                )
        );
    }
}
```

有了战利品表子提供器后，将其添加到战利品提供器的构造器：

```java
new LootTableProvider(output, Set.of(), List.of(
        new SubProviderEntry(
                // 对子提供器构造器的引用。
                // 这是一个 Function<HolderLookup.Provider, ? extends LootTableSubProvider>。
                MyLootTableSubProvider::new,
                // 关联的战利品上下文集。如果你不确定使用什么，请使用空。
                LootContextParamSets.EMPTY
        ),
        // 其他子提供器（如果适用）
    ), lookupProvider
);
```

### `BlockLootSubProvider`

`BlockLootSubProvider` 是抽象辅助类，包含许多用于创建常见方块战利品表的辅助方法，例如单物品掉落（`#createSingleItemTable`）、掉落创建该表的方块本身（`#dropSelf`）、仅在精准采集时掉落（`#createSilkTouchOnlyTable`）、台阶类方块掉落（`#createSlabItemTable`）等。遗憾的是，为模组用途设置 `BlockLootSubProvider` 需要更多样板代码：

```java
public class MyBlockLootSubProvider extends BlockLootSubProvider {
    // 如果此类是战利品表提供器的内部类，则构造器可以是 private。
    // 该参数由 LootTableProvider 构造器中的 lambda 提供。
    public MyBlockLootSubProvider(HolderLookup.Provider lookupProvider) {
        // 第一个参数是我们为其创建战利品表的一组方块。而不是硬编码，
        // 我们使用方块注册表并在此处传递一个空集。
        // 第二个参数是功能标志设置，此将是默认标志
        // 除非你要添加自定义 flags（这超出了此文章的范围）。
        super(Set.of(), FeatureFlags.DEFAULT_FLAGS, lookupProvider);
    }

    // 此 Iterable 的内容用于验证。
    // 我们在这里的方块注册表值上有返回和 Iterable。
    @Override
    protected Iterable<Block> getKnownBlocks() {
        // 我们的 DeferredRegister 的内容。
        return MyRegistries.BLOCK_REGISTRY.getEntries()
                .stream()
                // 在这里转换为方块，否则它将是 ? extends Block，Java 会报错。
                .map(e -> (Block) e.value())
                .toList();
    }

    // 实际上添加我们的战利品表。
    @Override
    protected void generate() {
        // 相当于调用 add(MyBlocks.EXAMPLE_BLOCK.get(), createSingleItemTable(MyBlocks.EXAMPLE_BLOCK.get()));
        this.dropSelf(MyBlocks.EXAMPLE_BLOCK.get());
        // 添加一张仅带有丝绸触感的战利品表。
        this.add(MyBlocks.EXAMPLE_SILK_TOUCHABLE_BLOCK.get(),
                this.createSilkTouchOnlyTable(MyBlocks.EXAMPLE_SILK_TOUCHABLE_BLOCK.get()));
        // 其他战利品表添加在这里
    }
}
```

随后像其他子提供器一样，将其添加到战利品表提供器的构造器：

```java
new LootTableProvider(output, Set.of(), List.of(new SubProviderEntry(
        MyBlockLootTableSubProvider::new,
        LootContextParamSets.BLOCK // 此处应使用 BLOCK
    )), lookupProvider
);
```

### `EntityLootSubProvider`

与 `BlockLootSubProvider` 类似，`EntityLootSubProvider` 为实体战利品表生成提供了许多辅助方法。同样与 `BlockLootSubProvider` 类似，我们必须提供该提供器已知实体的 `Stream<EntityType<?>>`（而不是前面使用的 `Iterable<Block>`）。总体上，实现与 `BlockLootSubProvider` 非常相似，只需将所有涉及方块的内容替换为实体类型：

```java
public class MyEntityLootSubProvider extends EntityLootSubProvider {
    public MyEntityLootSubProvider(HolderLookup.Provider lookupProvider) {
        // 与方块不同，我们不提供一组已知的实体类型。 原版在这里使用自定义检查。
        super(FeatureFlags.DEFAULT_FLAGS, lookupProvider);
    }

    // 该类使用 Stream 而不是 Iterable，因此我们需要稍微调整此。
    @Override
    protected Stream<EntityType<?>> getKnownEntityTypes() {
        return MyRegistries.ENTITY_TYPES.getEntries()
                .stream()
                .map(e -> (EntityType<?>) e.value());
    }

    @Override
    protected void generate() {
        this.add(MyEntities.EXAMPLE_ENTITY.get(), LootTable.lootTable());
        // 其他战利品表添加在这里
    }
}
```

同样，随后将子提供器添加到战利品表提供器的构造器：

```java
new LootTableProvider(output, Set.of(), List.of(new SubProviderEntry(
        MyEntityLootTableSubProvider::new,
        LootContextParamSets.ENTITY
    )), lookupProvider
);
```

[advancement]: ../advancements.md
[binomial]: https://en.wikipedia.org/wiki/Binomial_distribution
[block]: ../../../blocks/index.md
[conditions]: ../conditions.md
[context]: #战利品上下文
[customentry]: custom.md#自定义战利品条目
[customlevelbased]: custom.md#自定义基于等级的值
[customnumber]: custom.md#自定义数值提供器
[damagesource]: ../damagetypes.md#创建和使用伤害来源
[datagen]: ../../index.md#数据生成
[entity]: ../../../entities/index.md
[entry]: #战利品条目
[glm]: glm.md
[lootcondition]: lootconditions
[lootfunction]: lootfunctions
[parameters]: #战利品参数
[raidherogifts]: ../datamaps/builtin.md#neoforgeraid_hero_gifts
[sides]: ../../../concepts/sides.md
[tags]: ../tags.md
