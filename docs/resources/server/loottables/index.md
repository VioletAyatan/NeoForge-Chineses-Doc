# 战利品表（Loot Tables）

战利品表是用于定义随机战利品掉落的数据文件。抽取战利品表会返回一个可能为空的 ItemStack 列表，其输出取决于（伪）随机性。战利品表位于 `data/<mod_id>/loot_table/<name>.json`。例如，泥土 Block 使用的战利品表 `minecraft:blocks/dirt` 位于 `data/minecraft/loot_table/blocks/dirt.json`。

Minecraft 在游戏中的许多位置使用战利品表，包括 [Block][block] 掉落、[Entity][entity] 掉落、箱子战利品、钓鱼战利品等。战利品表的引用方式取决于上下文：

- 默认情况下，每个 Block 都会获得一个位于 `<block_namespace>:blocks/<block_name>` 的关联战利品表。可以在 Block 的 `Properties` 上调用 `#noLootTable` 将其禁用，这样不会创建战利品表，Block 也不会掉落任何内容；此做法主要用于空气类或技术型 Block。
- 默认情况下，所有未调用 `EntityType.Builder#noLootTable` 的 Entity（通常是 `MobCategory#MISC` 中的 Entity）都会获得一个位于 `<entity_namespace>:entities/<entity_name>` 的关联战利品表。可以通过重写 `#getLootTable` 更改它。例如，绵羊会根据羊毛颜色抽取不同战利品表。
- 结构中的箱子会在 BlockEntity 数据中指定战利品表。Minecraft 将所有箱子战利品表存放在 `minecraft:chests/<chest_name>`；建议 mod 遵循这一做法，但并非强制。
- 袭击结束后村民可能投给玩家的礼物 Item，其战利品表定义在 [`neoforge:raid_hero_gifts` 数据映射][raidherogifts] 中。
- 其他战利品表（例如钓鱼战利品表）会在需要时从 `level.getServer().reloadableRegistries().getLootTable(lootTableKey)` 获取。所有原版战利品表位置的列表可在 `BuiltInLootTables` 中找到。

:::warning
通常只应为属于自己 mod 的内容创建战利品表。修改现有战利品表时，应改用[全局战利品修改器（GLM）][glm]。
:::

由于战利品表系统较为复杂，它由多个用途不同的子系统组成。

## 战利品条目

战利品条目（或战利品池条目）在代码中由抽象类 `LootPoolEntryContainer` 表示，是单个战利品元素。它可以指定一个或多个待掉落 Item。

战利品条目通常分为两组：单例（公共超类为 `LootPoolSingletonContainer`）与复合条目（公共超类为 `CompositeEntryBase`）；复合条目由多个单例组成。Minecraft 提供以下单例类型：

- `minecraft:empty`：空战利品条目，表示没有 Item。在代码中调用 `EmptyLootItem#emptyItem` 创建。
- `minecraft:item`：单个战利品 Item 条目，抽取时掉落指定 Item。在代码中以所需 Item 调用 `LootItem#lootTableItem` 创建。
    - 可以使用战利品函数设置 ItemStack 数量、数据组件等。
- `minecraft:tag`：标签条目，抽取时掉落指定标签中的所有 Item。它有两个变体，取决于布尔属性 `expand` 的值。如果 `expand` 为 true，会为标签中的每个 Item 生成独立条目；否则使用一个条目掉落所有 Item。分别以 Item [标签键][tags]参数调用 `TagEntry#tagContents`（`expand=false`）或 `TagEntry#expandTag`（`expand=true`）创建。
    - 例如，如果 `expand` 为 true 且标签为 `#minecraft:planks`，则每种木板都会生成一个条目（11 种原版木板对应 11 个条目，外加每种 mod 木板各一个条目），每个条目都具有指定权重、品质和函数；如果 `expand` 为 false，则使用一个能够掉落所有木板的条目。
- `minecraft:slots`：引用任意物品栏槽位（例如 Entity、Item 等）的战利品条目。`minecraft:slot_range` 来源可用于定位 Entity 和 BlockEntity；`minecraft:contents` 可用于定位带有基于内容的数据组件，且定义并注册了 `ContainerComponentManipulator` 的 Item。
- `minecraft:dynamic`：引用动态掉落的战利品条目。动态掉落用于向战利品表添加无法预先指定、只能在代码中加入的条目。动态掉落条目由 id 与实际添加 Item 的 `Consumer<ItemStack>` 组成。要添加动态掉落条目，请以所需 id 指定 `minecraft:dynamic` 条目，再在[战利品上下文][context]中添加对应 Consumer。使用 `DynamicLoot#dynamicEntry` 创建。
- `minecraft:loot_table`：抽取另一个战利品表，并将其结果作为单个条目添加。另一个战利品表既可通过 id 指定，也可完整内联。在代码中，以 `Identifier` 参数调用 `NestedLootTable#lootTableReference`，或针对内联战利品表以 `LootTable` 对象参数调用 `NestedLootTable#inlineLootTable` 创建。

Minecraft 提供以下复合类型：

- `minecraft:group`：包含其他战利品条目列表，并按顺序运行的战利品条目。在代码中以其他战利品条目 builder 调用 `EntryGroup#list`，或在另一个 `LootPoolSingletonContainer.Builder` 上调用 `#append` 创建。
- `minecraft:sequence`：与 `minecraft:group` 类似，但任一子条目失败后会立即停止运行，并丢弃其后的所有条目。在代码中以其他战利品条目 builder 调用 `SequentialEntry#sequential`，或在另一个 `LootPoolSingletonContainer.Builder` 上调用 `#then` 创建。
- `minecraft:alternatives`：某种意义上与 `minecraft:sequence` 相反；任一子条目成功后（而不是失败后）会立即停止运行，并丢弃其后的所有条目。在代码中以其他战利品条目 builder 调用 `AlternativesEntry#alternatives`，或在另一个 `LootPoolSingletonContainer.Builder` 上调用 `#otherwise` 创建。

通过公共超类 `LootPoolEntryContainer`，这些条目都具有 `conditions` 属性，用于提供要应用到该战利品条目的[战利品条件][lootcondition]列表。只要一个条件失败，就会将该条目视为不存在。

扩展 `LootPoolSingletonContainer` 的单例还具有：

- `weight`：权重值，默认为 1。用于让某些 Item 比其他 Item 更常见。例如，有两个战利品条目，一个权重为 3，另一个权重为 1，则第一个条目有 75% 的概率被选中，第二个为 25%。
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

- `minecraft:constant`：常量 float 值，在需要时舍入为整数。通过 `ConstantValue#exactly` 创建。
- `minecraft:uniform`：均匀分布的随机整数或 float 值，设有最小值和最大值。最小值与最大值之间的所有值出现概率相同。通过 `UniformGenerator#between` 创建。
- `minecraft:binomial`：二项分布的随机整数值，设有 n 和 p。有关这些值的含义，更多信息请参阅[二项分布][binomial]。通过 `BinomialDistributionGenerator#binomial` 创建。
- `minecraft:score`：给定目标 Entity、分数名称及可选缩放值，获取目标 Entity 的指定记分板值，并乘以给定缩放值（若有）。通过 `ScoreboardValue#fromScoreboard` 创建。
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

- `minecraft:this_entity`：与战利品表关联的 Entity，通常是被击杀的 Entity。通过 `LootContextParams.THIS_ENTITY` 访问。
- `minecraft:interacting_entity`：与战利品表交互的 Entity，例如挖掘 Block 的玩家。通过 `LootContextParams.INTERACTING_ENTITY` 访问。
- `minecraft:target_entity`：与战利品表关联的 Entity，通常是某种交互的目标。通过 `LootContextParams.TARGET_ENTITY` 访问。
- `minecraft:last_damage_player`：与战利品表关联的玩家，通常是最后攻击被击杀 Entity 的玩家，即使该玩家是间接击杀（例如玩家轻击 Entity，之后它被尖刺杀死）。用于仅限玩家击杀时掉落等场景。通过 `LootContextParams.LAST_DAMAGE_PLAYER` 访问。
- `minecraft:damage_source`：与战利品表关联的 [伤害来源][damagesource]，通常是击杀 Entity 的伤害来源。通过 `LootContextParams.DAMAGE_SOURCE` 访问。
- `minecraft:attacking_entity`：与战利品表关联的攻击 Entity，通常是击杀该 Entity 的对象。通过 `LootContextParams.ATTACKING_ENTITY` 访问。
- `minecraft:direct_attacking_entity`：与战利品表关联的直接攻击 Entity。例如，如果攻击 Entity 是骷髅，则直接攻击 Entity 是箭。通过 `LootContextParams.DIRECT_ATTACKING_ENTITY` 访问。
- `minecraft:origin`：与战利品表关联的位置，例如战利品箱的位置。通过 `LootContextParams.ORIGIN` 访问。
- `minecraft:block_state`：与战利品表关联的 BlockState，例如被破坏的 BlockState。通过 `LootContextParams.BLOCK_STATE` 访问。
- `minecraft:block_entity`：与战利品表关联的 BlockEntity，例如与被破坏 Block 关联的 BlockEntity。潜影盒会用它将物品栏保存到掉落 Item 中。通过 `LootContextParams.BLOCK_ENTITY` 访问。
- `minecraft:tool`：与战利品表关联的 Item 实例，例如用于破坏 Block 的 Item。它不一定是工具。通过 `LootContextParams.TOOL` 访问。
- `minecraft:explosion_radius`：当前上下文中的爆炸半径，主要用于向掉落物应用爆炸衰减。通过 `LootContextParams.EXPLOSION_RADIUS` 访问。
- `minecraft:enchantment_level`：附魔等级，供附魔逻辑使用。通过 `LootContextParams.ENCHANTMENT_LEVEL` 访问。
- `minecraft:enchantment_active`：所用 Item 是否带有附魔，例如用于精准采集检查。通过 `LootContextParams.ENCHANTMENT_ACTIVE` 访问。
- `minecraft:additional_cost_component_allowed`：如果交易元数据需要，允许村民交易产生额外费用。

可以用所需 id 调用 `new ContextKey<T>` 创建自定义战利品参数。由于它们只是资源位置包装器，因此无需注册。

### 目标 Entity

目标 Entity 是战利品条件与函数中使用的类型，在代码中由 `LootContext.EntityTarget` 枚举表示。它们用于指定在条件或函数上下文中查询哪个 Entity 战利品参数。有效值包括：

- `"this"` 或 `LootContext.EntityTarget.THIS`：表示 `"minecraft:this_entity"` 参数。
- `"attacker"` 或 `LootContext.EntityTarget.ATTACKER`：表示 `"minecraft:attacking_entity"` 参数。
- `"direct_attacker"` 或 `LootContext.EntityTarget.DIRECT_ATTACKER`：表示 `"minecraft:direct_attacking_entity"` 参数。
- `"attacking_player"` 或 `LootContext.EntityTarget.ATTACKING_PLAYER`：表示 `"minecraft:last_damage_player"` 参数。
- `"target_entity"` 或 `LootContext.EntityTarget.TARGET_ENTITY`：表示 `"minecraft:target_entity"` 参数。
- `"interacting_entity"` 或 `LootContext.EntityTarget.INTERACTING_ENTITY`：表示 `"minecraft:interacting_entity"` 参数。

例如，`minecraft:entity_properties` 战利品条件接受一个目标 Entity；如果战利品表作者需要，就可以检查所有这些战利品参数。

### 战利品参数集

战利品参数集也称为战利品表类型，在代码中称为 `ContextKeySet`，是必需与可选战利品参数的集合。尽管名称如此，它们并不是 `Set`（甚至不是 `Collection`），而是对两个 `Set<ContextKey<?>>` 的包装：一个保存必需参数（`#required`），另一个保存可选参数（`#allowed`）。它们用于验证战利品参数的使用者只使用预期可用的参数，并验证抽取战利品表时所有必需参数均已存在。此外，成就与附魔逻辑也会使用它们。

原版提供以下战利品参数集（必需参数以**粗体**显示，可选参数以_斜体_显示；代码中的名称是 `LootContextParamSets` 内的常量）：

| ID                               | 代码中的名称           | 指定的战利品参数                                                                                                                                                                                                                                                                                                     | 用途                                                      |
|----------------------------------|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| `minecraft:empty`                | `EMPTY`                | 不适用                                                                                                                                                                                                                                                                                                               | 备用用途。                                                |
| `minecraft:generic`              | `ALL_PARAMS`           | **`minecraft:origin`**, **`minecraft:tool`**, **`minecraft:block_state`**, **`minecraft:block_entity`**, **`minecraft:explosion_radius`**, **`minecraft:this_entity`**, **`minecraft:damage_source`**, **`minecraft:attacking_entity`**, **`minecraft:direct_attacking_entity`**, **`minecraft:last_damage_player`** | 验证。                                                    |
| `minecraft:command`              | `COMMAND`              | **`minecraft:origin`**, _`minecraft:this_entity`_                                                                                                                                                                                                                                                                    | 命令。                                                    |
| `minecraft:selector`             | `SELECTOR`             | **`minecraft:origin`**, _`minecraft:this_entity`_                                                                                                                                                                                                                                                                    | 命令中的 Entity 选择器。                                  |
| `minecraft:villager_trade`       | `VILLAGER_TRADE`       | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:additional_cost_component_allowed`**,                                                                                                                                                                                                             | 村民交易。                                                |
| `minecraft:block`                | `BLOCK`                | **`minecraft:origin`**, **`minecraft:tool`**, **`minecraft:block_state`**, _`minecraft:block_entity`_, _`minecraft:explosion_radius`_, _`minecraft:this_entity`_                                                                                                                                                     | 破坏 Block。                                              |
| `minecraft:block_use`            | `BLOCK_USE`            | **`minecraft:origin`**, **`minecraft:block_state`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                     | 原版未使用。                                              |
| `minecraft:block_interact`       | `BLOCK_INTERACT`       | **`minecraft:block_state`**, _`minecraft:block_entity`_, _`minecraft:interacting_entity`_, _`minecraft:tool`_                                                                                                                                                                                                       | Block 交互。                                              |
| `minecraft:hit_block`            | `HIT_BLOCK`            | **`minecraft:origin`**, **`minecraft:enchantment_level`**, **`minecraft:block_state`**, **`minecraft:this_entity`**                                                                                                                                                                                                  | 引雷附魔。                                                |
| `minecraft:chest`                | `CHEST`                | **`minecraft:origin`**, _`minecraft:this_entity`_, _`minecraft:attacking_entity`_                                                                                                                                                                                                                                    | 战利品箱及类似容器、运输战利品箱的矿车。                  |
| `minecraft:archaeology`          | `ARCHAEOLOGY`          | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:tool`**                                                                                                                                                                                                                                            | 考古。                                                    |
| `minecraft:vault`                | `VAULT`                | **`minecraft:origin`**, _`minecraft:this_entity`_, _`minecraft:tool`_                                                                                                                                                                                                                                                | 试炼密室宝库奖励。                                        |
| `minecraft:entity`               | `ENTITY`               | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:damage_source`**, _`minecraft:attacking_entity`_, _`minecraft:direct_attacking_entity`_, _`minecraft:last_damage_player`_                                                                                                                          | Entity 击杀。                                             |
| `minecraft:entity_interact`      | `ENTITY_INTERACT`      | **`minecraft:target_entity`**, **`minecraft:tool`**, _`minecraft:interacting_entity`_                                                                                                                                                                                                                                | Entity 交互。                                             |
| `minecraft:shearing`             | `SHEARING`             | **`minecraft:origin`**, **`minecraft:this_entity`**, **`minecraft:tool`**                                                                                                                                                                                                                                            | 剪取 Entity，例如绵羊。                                   |
| `minecraft:equipment`            | `EQUIPMENT`            | **`minecraft:origin`**, **`minecraft:this_entity`**                                                                                                                                                                                                                                                                  | Entity 装备，例如僵尸装备。                                |
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
- 幸运值，用于计算额外抽取次数与品质值。通常通过 Entity 的幸运属性填充。通过 `#getLuck` 获取。
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
    "type": "chest", // loot parameter set
    "neoforge:conditions": [
        // data load conditions
    ],
    "functions": [
        // table-wide loot functions
    ],
    "pools": [ // list of loot pools
        {
            "rolls": 1, // amount of rolls of the loot table, using 5 here will yield 5 results from the pool
            "bonus_rolls": 0.5, // amount of bonus rolls
            "name": "my_pool",
            "conditions": [
                // pool-wide loot conditions
            ],
            "functions": [
                // pool-wide loot functions
            ],
            "entries": [ // list of loot table entries
                {
                    "type": "minecraft:item", // loot entry type
                    "name": "minecraft:dirt", // type-specific properties, for example the name of the item
                    "weight": 3, // weight of an entry
                    "quality": 1, // quality of an entry
                    "conditions": [
                        // entry-wide loot conditions
                    ],
                    "functions": [
                        // entry-wide loot functions
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
Minecraft 的内置战利品表 ID 可在 `BuiltInLootTables` 类中找到。Block 战利品表可通过 `BlockBehaviour#getLootTable` 获取，Entity 战利品表可通过 `EntityType#getDefaultLootTable` 或 `Entity#getLootTable` 获取。
:::

有了战利品表后，接下来构建参数集。首先创建 `LootParams.Builder` 实例：

```java
// Make sure that you are on a server, otherwise the cast will fail.
LootParams.Builder builder = new LootParams.Builder((ServerLevel) level);
```

随后添加战利品上下文参数：

```java
// Use whatever context parameters and values you need. Vanilla parameters can be found in LootContextParams.
builder.withParameter(LootContextParams.ORIGIN, position);
// This variant can accept null as the value, in which case an existing value for that parameter will be removed.
builder.withOptionalParameter(LootContextParams.ORIGIN, null);
// Add a dynamic drop.
builder.withDynamicDrop(Identifier.fromNamespaceAndPath("examplemod", "example_dynamic_drop"), stackAcceptor -> {
    // some logic here
});
// Set our luck value. Assumes that a player is available. Contexts without a player should use 0 here.
builder.withLuck(player.getLuck());
```

最后，从 builder 创建 `LootParams`，并用它抽取战利品表：

```java
// Specify a loot context param set here if you want.
LootParams params = builder.create(LootContextParamSets.EMPTY);
// Get the loot table.
LootTable table = level.getServer().reloadableRegistries().getLootTable(location);
// Actually roll the loot table.
List<ItemStack> list = table.getRandomItems(params);
// Use this instead if you are rolling the loot table for container contents, e.g. loot chests.
// This method takes care of properly splitting the loot items across the container.
List<ItemStack> containerList = table.fill(container, params, someSeed);
```

:::danger
`LootTable` 还公开了名为 `#getRandomItemsRaw` 的方法。与各种 `#getRandomItems` 变体不同，`#getRandomItemsRaw` 不会应用[全局战利品修改器][glm]。只有在明确了解其影响时才使用此方法。
:::

## 数据生成

可以通过注册 `LootTableProvider`，并在构造器中提供 `LootTableSubProvider` 列表，通过[数据生成][datagen]创建战利品表：

```java
@SubscribeEvent // on the mod event bus
public static void onGatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createProvider((output, lookupProvider) -> new LootTableProvider(
        output,
        // A set of required table resource locations. These are later verified to be present.
        // It is generally not recommended for mods to validate existence,
        // therefore we pass in an empty set.
        Set.of(),
        // A list of sub provider entries. See below for what values to use here.
        List.of(...),
        // The registry access
        lookupProvider
    ));
}
```

### `LootTableSubProvider`

`LootTableSubProvider` 是实际执行生成的位置。首先实现 `LootTableSubProvider` 并重写 `#generate`：

```java
public class MyLootTableSubProvider implements LootTableSubProvider {
    // The parameter is provided by the lambda (see below). It can be stored and used to lookup other registry entries.
    public MyLootTableSubProvider(HolderLookup.Provider lookupProvider) {
        // Store the lookupProvider in a field
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
                // Add a loot table-level loot function. This example uses a number provider (see below).
                .apply(SetItemCountFunction.setCount(ConstantValue.exactly(5)))
                // Add a loot pool.
                .withPool(LootPool.lootPool()
                        // Add a loot pool-level function, similar to above.
                        .apply(...)
                        // Add a loot pool-level condition. This example only rolls the pool if it is raining.
                        .when(WeatherCheck.weather().setRaining(true))
                        // Set the amount of rolls and bonus rolls, respectively.
                        // Both of these methods utilize a number provider.
                        .setRolls(UniformGenerator.between(5, 9))
                        .setBonusRolls(ConstantValue.exactly(1))
                        // Add a loot entry. This example returns an item loot entry. See below for more loot entries.
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
                // A reference to the sub provider's constructor.
                // This is a Function<HolderLookup.Provider, ? extends LootTableSubProvider>.
                MyLootTableSubProvider::new,
                // An associated loot context set. If you're unsure what to use, use empty.
                LootContextParamSets.EMPTY
        ),
        // other sub providers here (if applicable)
    ), lookupProvider
);
```

### `BlockLootSubProvider`

`BlockLootSubProvider` 是抽象辅助类，包含许多用于创建常见 Block 战利品表的辅助方法，例如单 Item 掉落（`#createSingleItemTable`）、掉落创建该表的 Block 本身（`#dropSelf`）、仅在精准采集时掉落（`#createSilkTouchOnlyTable`）、台阶类 Block 掉落（`#createSlabItemTable`）等。遗憾的是，为 mod 用途设置 `BlockLootSubProvider` 需要更多样板代码：

```java
public class MyBlockLootSubProvider extends BlockLootSubProvider {
    // The constructor can be private if this class is an inner class of your loot table provider.
    // The parameter is provided by the lambda in the LootTableProvider's constructor.
    public MyBlockLootSubProvider(HolderLookup.Provider lookupProvider) {
        // The first parameter is a set of blocks we are creating loot tables for. Instead of hardcoding,
        // we use our block registry and just pass an empty set here.
        // The second parameter is the feature flag set, this will be the default flags
        // unless you are adding custom flags (which is beyond the scope of this article).
        super(Set.of(), FeatureFlags.DEFAULT_FLAGS, lookupProvider);
    }

    // The contents of this Iterable are used for validation.
    // We return an Iterable over our block registry's values here.
    @Override
    protected Iterable<Block> getKnownBlocks() {
        // The contents of our DeferredRegister.
        return MyRegistries.BLOCK_REGISTRY.getEntries()
                .stream()
                // Cast to Block here, otherwise it will be a ? extends Block and Java will complain.
                .map(e -> (Block) e.value())
                .toList();
    }

    // Actually add our loot tables.
    @Override
    protected void generate() {
        // Equivalent to calling add(MyBlocks.EXAMPLE_BLOCK.get(), createSingleItemTable(MyBlocks.EXAMPLE_BLOCK.get()));
        this.dropSelf(MyBlocks.EXAMPLE_BLOCK.get());
        // Add a table with a silk touch only loot table.
        this.add(MyBlocks.EXAMPLE_SILK_TOUCHABLE_BLOCK.get(),
                this.createSilkTouchOnlyTable(MyBlocks.EXAMPLE_SILK_TOUCHABLE_BLOCK.get()));
        // other loot table additions here
    }
}
```

随后像其他子提供器一样，将其添加到战利品表提供器的构造器：

```java
new LootTableProvider(output, Set.of(), List.of(new SubProviderEntry(
        MyBlockLootTableSubProvider::new,
        LootContextParamSets.BLOCK // it makes sense to use BLOCK here
    )), lookupProvider
);
```

### `EntityLootSubProvider`

与 `BlockLootSubProvider` 类似，`EntityLootSubProvider` 为 Entity 战利品表生成提供了许多辅助方法。同样与 `BlockLootSubProvider` 类似，我们必须提供该提供器已知 Entity 的 `Stream<EntityType<?>>`（而不是前面使用的 `Iterable<Block>`）。总体上，实现与 `BlockLootSubProvider` 非常相似，只需将所有涉及 Block 的内容替换为 Entity Type：

```java
public class MyEntityLootSubProvider extends EntityLootSubProvider {
    public MyEntityLootSubProvider(HolderLookup.Provider lookupProvider) {
        // Unlike with blocks, we do not provide a set of known entity types. Vanilla instead uses custom checks here.
        super(FeatureFlags.DEFAULT_FLAGS, lookupProvider);
    }

    // This class uses a Stream instead of an Iterable, so we need to adjust this slightly.
    @Override
    protected Stream<EntityType<?>> getKnownEntityTypes() {
        return MyRegistries.ENTITY_TYPES.getEntries()
                .stream()
                .map(e -> (EntityType<?>) e.value());
    }

    @Override
    protected void generate() {
        this.add(MyEntities.EXAMPLE_ENTITY.get(), LootTable.lootTable());
        // other loot table additions here
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
[context]: #loot-context
[customentry]: custom.md#custom-loot-entry-types
[customlevelbased]: custom.md#custom-level-based-values
[customnumber]: custom.md#custom-number-providers
[damagesource]: ../damagetypes.md#创建和使用伤害来源
[datagen]: ../../index.md#data-generation
[entity]: ../../../entities/index.md
[entry]: #loot-entry
[glm]: glm.md
[lootcondition]: lootconditions
[lootfunction]: lootfunctions
[parameters]: #loot-parameters
[raidherogifts]: ../datamaps/builtin.md#neoforgeraid_hero_gifts
[sides]: ../../../concepts/sides.md
[tags]: ../tags.md
