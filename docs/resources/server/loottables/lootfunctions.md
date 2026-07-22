# 战利品函数（Loot Functions）

战利品函数可用于修改[战利品条目][entry]的结果，或修改[战利品池][pool]、[战利品表][table]产生的多个结果。在这些情况下，会定义一个按顺序运行的函数列表。数据生成期间，可以通过调用 `#apply` 将战利品函数应用到 `LootPoolSingletonContainer.Builder<?>`、`LootPool.Builder` 和 `LootTable.Builder`。本文将介绍可用的战利品函数。要创建自定义战利品函数，请参阅[自定义战利品函数][custom]。

:::info
战利品函数不能应用到复合战利品条目（`CompositeEntryBase` 的子类及其关联 builder 类），必须手动添加到每个单例条目。
:::

除 `minecraft:sequence` 外，所有原版战利品函数都可以在 `conditions` 块中指定[战利品条件][conditions]。如果其中任一条件失败，就不会应用该函数。在代码层面，这由 `LootItemConditionalFunction` 控制；除 `SequenceFunction` 外，所有战利品函数都扩展该类。

## `minecraft:set_item`

设置结果 ItemStack 使用的另一个 Item。

```json5
{
    "function": "minecraft:set_item",
    // 要使用的物品。
    "item": "minecraft:dirt"
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_count`

设置结果 ItemStack 使用的 Item 数量。使用[数值提供器][numberprovider]。

```json5
{
    "function": "minecraft:set_count",
    // 要使用的计数。
    "count": {
        "type": "minecraft:uniform",
        "min": 1,
        "max": 3
    },
    // 是否添加到现有值而不是设置它。 可选，默认为false。
    "add": true
}
```

数据生成期间，以所需数值提供器以及可选的 `add` 布尔值调用 `SetItemCountFunction#setCount`，为此函数构造 builder。

## `minecraft:explosion_decay`

应用爆炸衰减。Item 有 1 / `explosion_radius` 的概率“存留”。根据数量，该过程会运行多次。它需要 `minecraft:explosion_radius` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:explosion_decay"
}
```

数据生成期间，调用 `ApplyExplosionDecay#explosionDecay` 为此函数构造 builder。

## `minecraft:limit_count`

将 ItemStack 数量限制在给定 `IntRange` 内。

```json5
{
    "function": "minecraft:limit_count",
    // 使用限制。可以有最小值、最大值或两者都有。
    "limit": {
        "max": 32
    }
}
```

数据生成期间，以所需 `IntRange` 调用 `LimitCount#limitCount`，为此函数构造 builder。

## `minecraft:set_custom_data`

在 ItemStack 上设置自定义 NBT 数据。

```json5
{
    "function": "minecraft:set_custom_data",
    "tag": {
        "exampleproperty": 0
    }
}
```

数据生成期间，以所需 [`CompoundTag`][nbt] 调用 `SetCustomDataFunction#setCustomData`，为此函数构造 builder。

:::warning
通常应将此函数视为已弃用。请改用 `minecraft:set_components`。
:::

## `minecraft:copy_custom_data`

将自定义 NBT 数据从 BlockEntity 或 Entity 来源复制到 ItemStack。对于 BlockEntity，不建议使用此函数，请改用 `minecraft:copy_components` 或 `minecraft:set_contents`。对于 Entity，需要设置[目标 Entity][entitytarget]。它需要与指定来源（目标 Entity 或 BlockEntity）对应的战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:copy_custom_data",
    // 要使用的源。有效值可以是实体目标，"block_entity"，以使用战利品上下文
    // 方块实体参数，或者命令存储为 "storage"。如果这是 "storage"，则它可以是
    // JSON 对象，另外指定要使用的命令存储路径。
    "source": "this",
    // 使用 "storage" 的示例。
    "source": {
        "type": "storage",
        "source": "examplepath"
    },
    // 副本 operation。
    "ops": [
        {
            // 源路径和目标路径。在此示例中，我们从源中的 "src" 复制到目标中的 "dest"。
            "source": "src",
            "target": "dest",
            // 合并策略。有效值为 "replace"、"append" 和 "merge"。
            "op": "merge"
        }
    ]
}
```

数据生成期间，以关联的 `NbtProvider` 调用 `CopyCustomDataFunction#copyData` 获取 builder。随后以所需来源值、目标值及合并策略（可选，默认为 `replace`）调用 `Builder#copy`，为此函数构造 builder。

## `minecraft:set_components`

在 ItemStack 上设置[数据组件][datacomponent]值。大多数原版用例都有专用函数，详见下文。

```json5
{
    "function": "minecraft:set_components",
    // 可以使用任何组件。在此示例中，我们将物品的染色颜色设置为红色。
    "components": {
        "dyed_color": {
            "rgb": 16711680
        }
    }
}
```

数据生成期间，以所需数据组件和值调用 `SetComponentsFunction#setComponent`，为此函数构造 builder。

## `minecraft:copy_components`

将[数据组件][datacomponent]值从 BlockEntity 复制到 ItemStack。它需要来自 `LootContext.BlockEntityTarget`、`LootContext.EntityTarget` 或 `LootContext.ItemStackTarget` 的某个战利品参数。

```json5
{
    "function": "minecraft:copy_components",
    // 上下文中指定的战利品参数之一
    // 对于实体：'this'、'attacker'、'direct_attacker'、'attacking_player'、'target_entity'、'interacting_entity'
    // 对于方块实体：'block_entity'
    // 对于物品堆叠：'tool'
    "source": "block_entity",
    // 默认情况下，复制所有组件。 "exclude" 列表允许排除某些组件，并且
    // "include" 列表允许显式重新包含组件。这两个字段都是可选的。
    "exclude": [],
    "include": []
}
```

数据生成期间，对于 BlockEntity 来源调用 `CopyComponentsFunction#copyComponentsFromBlockEntity`，对于 Entity 来源调用 `copyComponentsFromEntity`，为此函数构造 builder。也可以使用 `CopyComponentsFunction.ItemStackSource`，前提是[扩大 builder 构造器的访问权限][at]。

## `minecraft:copy_state`

将 BlockState property 复制到 ItemStack 的 `block_state` [数据组件][datacomponent]中，供尝试放置 Block 时使用。必须明确指定要复制的 BlockState property。它需要 `minecraft:block_state` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:copy_state",
    // 预期的方块。如果与实际被破坏的方块不匹配，函数就不会运行。
    "block": "minecraft:oak_slab",
    // 要保存的方块状态 property。
    "properties": {
        "type": "top"
    }
}
```

数据生成期间，以 Block 调用 `CopyBlockState#copyState`，为此函数构造 builder。随后可使用 `#copy` 在 builder 上设置所需 BlockState property 值。

## `minecraft:set_contents`

设置 ItemStack 的内容。

```json5
{
    "function": "minecraft:set_contents",
    // 要使用的内容组件。有效值为 "container"、"bundle_contents" 和 "charged_projectiles"。
    "component": "container",
    // 要添加到内容中的战利品条目列表。
    "entries": [
        {
            "type": "minecraft:empty",
            "weight": 3
        },
        {
            "type": "minecraft:item",
            "item": "minecraft:arrow"
        }
    ]
}
```

数据生成期间，以所需内容组件调用 `SetContainerContents#setContents`，为此函数构造 builder。随后在 builder 上调用 `#withEntry` 添加条目。

## `minecraft:modify_contents`

向 ItemStack 的内容应用函数。

```json5
{
    "function": "minecraft:modify_contents",
    // 要使用的内容组件。有效值为 "container"、"bundle_contents" 和 "charged_projectiles"。
    "component": "container",
    // 要使用的函数。
    "modifier": "apply_explosion_decay"
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_loot_table`

在结果 ItemStack 上设置容器战利品表。它适用于箱子及其他放置后仍保留此属性的战利品容器。

```json5
{
    "function": "minecraft:set_loot_table",
    // 要使用的战利品表的 ID。
    "name": "minecraft:entities/enderman",
    // 目标方块实体的方块实体类型ID。
    "type": "minecraft:chest",
    // 用于生成战利品表的随机种子。可选，默认为 0。
    "seed": 42
}
```

数据生成期间，以所需 BlockEntity 类型、战利品表资源键及可选种子调用 `SetContainerLootTable#withLootTable`，为此函数构造 builder。

## `minecraft:set_name`

为结果 ItemStack 设置名称。名称可以是 [`Component`][component]，而非字面字符串；也可以从[目标 Entity][entitytarget] 解析。适用时需要对应的 Entity 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:set_name",
    "name": "Funny Item",
    // 要使用的实体目标。
    "entity": "this",
    // 是否设置自定义name（"custom_name"）或物品name（"item_name"）本身。
    // 自定义名称以斜体显示，并且可以在铁砧中更改，而物品名称则不能。
    "target": "custom_name"
}
```

数据生成期间，以所需名称组件、名称目标及可选目标 Entity 调用 `SetNameFunction#setName`，为此函数构造 builder。

## `minecraft:copy_name`

将[目标 Entity][entitytarget] 或 BlockEntity 的名称复制到结果 ItemStack。它需要与指定来源（目标 Entity 或 BlockEntity）对应的战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:copy_name",
    // 实体目标，如果要复制方块实体的名称，则为 "block_entity"。
    "source": "this"
}
```

数据生成期间，以所需 `LootContext.BlockEntityTarget` 或 `LootContext.EntityTarget` 上下文参数调用 `CopyNameFunction#copyName`，为此函数构造 builder。

## `minecraft:set_lore`

为结果 ItemStack 设置 lore（工具提示行）。各行可以是 [`Component`][component]，而非字面字符串；也可以从[目标 Entity][entitytarget] 解析。适用时需要对应的 Entity 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:set_lore",
    "lore": [
        "Funny Lore",
        "Funny Lore 2"
    ],
    // 使用的合并模式。有效值为：
    // - "append"：将条目附加到任何现有的传说条目中。
    // - "insert"：在特定位置插入条目。该位置被表示为附加字段
    //   命名为 "offset"。 "offset" 可选，默认为 0。
    // - "replace_all"：删除所有以前的条目，然后追加这些条目。
    // - "replace_section"：删除一部分条目，然后在该位置添加条目。
    //   删除的部分通过 "offset" 和可选的 "size" 字段表示。
    //   如果省略 "size"，则使用 "lore" 中的行数。
    "mode": {
        "type": "insert",
        "offset": 0
    },
    // 要使用的实体目标。
    "entity": "this"
}
```

数据生成期间，调用 `SetLoreFunction#setLore` 为此函数构造 builder。随后按需在 builder 上调用 `#addLine`、`#setMode` 和 `#setResolutionContext`。

## `minecraft:toggle_tooltips`

启用或禁用特定组件的工具提示。

```json5
{
    "function": "minecraft:toggle_tooltips",
    "toggles": {
        // 所有值均为可选。省略时，使用 ItemStack 上已有的值。
        // 预先存在的值通常是 true，除非它们已被其他函数修改。
        "minecraft:attribute_modifiers": false,
        "minecraft:can_break": false,
        "minecraft:can_place_on": false,
        "minecraft:dyed_color": false,
        "minecraft:enchantments": false,
        "minecraft:jukebox_playable": false,
        "minecraft:stored_enchantments": false,
        "minecraft:trim": false,
        "minecraft:unbreakable": false
    }
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:enchant_with_levels`

使用给定等级数随机附魔 ItemStack。使用[数值提供器][numberprovider]。

```json5
    {
    "function": "minecraft:enchant_with_levels",
    // 要使用的级别数量。
    "levels": {
        "type": "minecraft:uniform",
        "min": 10,
        "max": 30
    },
    // 可能的附魔列表。 可选，默认为该物品的所有适用的附魔。
    "options": [
        "minecraft:sharpness",
        "minecraft:fire_aspect"
    ],
    // 如果成功，是否允许此函数应用额外的交易费用。
    "include_additional_cost_component": true
}
```

数据生成期间，以所需数值提供器调用 `EnchantWithLevelsFunction#enchantWithLevels`，为此函数构造 builder。随后可按需使用 `#fromOptions` 在 builder 上设置附魔列表。

## `minecraft:enchant_randomly`

为 Item 添加一个随机附魔。

```json5
{
    "function": "minecraft:enchant_randomly",
    // 可能的附魔列表。 可选，默认为所有附魔。
    "options": [
        "minecraft:sharpness",
        "minecraft:fire_aspect"
    ],
    // 是否仅允许兼容的附魔，而非任意附魔。可选，默认为 true。
    "only_compatible": true,
    // 如果成功，是否允许此函数应用额外的交易费用。
    "include_additional_cost_component": true
}
```

数据生成期间，调用 `EnchantRandomlyFunction#randomEnchantment` 或 `EnchantRandomlyFunction#randomApplicableEnchantment`，为此函数构造 builder。随后可按需在 builder 上调用 `#withEnchantment`、`#withOneOf` 或 `#withOptions`。

## `minecraft:set_enchantments`

在结果 ItemStack 上设置附魔。

```json5
{
    "function": "minecraft:set_enchantments",
    // 数值提供器的附魔映射。
    "enchantments": {
        "minecraft:fire_aspect": 2,
        "minecraft:sharpness": {
        "type": "minecraft:uniform",
        "min": 3,
        "max": 5,
        }
    },
    // 是否将附魔等级累加到现有等级，而非覆盖。可选，默认为 false。
    "add": true
}
```

数据生成期间，以可选的 `add` 布尔值调用 `new SetEnchantmentsFunction.Builder`，为此函数构造 builder。随后调用 `#withEnchantment` 添加要设置的附魔。

## `minecraft:enchanted_count_increase`

根据附魔值增加 ItemStack 数量。使用[数值提供器][numberprovider]。它需要 `minecraft:attacking_entity` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:enchanted_count_increase",
    // 要使用的附魔。
    "enchantment": "minecraft:fortune",
    // 每级增加的数量。数值提供器每次函数执行只抽取一次，而不是每级抽取一次。
    "count": {
        "type": "minecraft:uniform",
        "min": 1,
        "max": 3
    },
    // ItemStack 数量上限，无论附魔等级如何都不会超过该值。可选。
    "limit": 5
}
```

数据生成期间，以所需数值提供器调用 `EnchantedCountIncreaseFunction#lootingMultiplier`，为此函数构造 builder。之后可选择在 builder 上调用 `#setLimit`。

## `minecraft:apply_bonus`

根据附魔值与不同公式增加 ItemStack 数量。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:apply_bonus",
    // 要查询的附魔值。
    "enchantment": "minecraft:fortune",
    // 要使用的公式。有效值为：
    // - "minecraft:binomial_with_bonus_count"：根据二项式分布应用奖金
    //   n = enchantment level + extra and p = probability.
    // - "minecraft:ore_drops"：根据矿石掉落的特殊公式（包括随机性）应用奖励。
    // - "minecraft:uniform_bonus_count"：根据恒定乘数缩放的附魔等级添加奖励。
    "formula": "ore_drops",
    // 参数值，取决于公式。
    // 如果公式为 "minecraft:binomial_with_bonus_count"，则需要 "extra" 和 "probability"。
    // 如果公式为 "minecraft:ore_drops"，则不需要参数。
    // 如果公式为 "minecraft:uniform_bonus_count"，则需要 "bonusMultiplier"。
    "parameters": {}
}
```

数据生成期间，根据公式，以附魔及其他必需参数调用 `ApplyBonusCount#addBonusBinomialDistributionCount`、`ApplyBonusCount#addOreBonusCount` 或 `ApplyBonusCount#addUniformBonusCount`，为此函数构造 builder。

## `minecraft:furnace_smelt`

尝试像在熔炉中一样烧炼 Item；如果无法烧炼，则返回未经修改的 ItemStack。

```json5
{
    "function": "minecraft:furnace_smelt",
    // 为 true 时，将使用当前输入的材料来确定
    // 基数。否则，将输出一个结果。
    "use_input_count": true
}
```

数据生成期间，调用 `SmeltItemFunction#smelted` 为此函数构造 builder。

## `minecraft:set_damage`

在结果 ItemStack 上设置耐久损耗值。使用[数值提供器][numberprovider]。

```json5
{
    "function": "minecraft:set_damage",
    // 要设置的耐久损耗值。
    "damage": {
        "type": "minecraft:uniform",
        "min": 10,
        "max": 300
    },
    // 是否在现有耐久损耗值上累加，而非直接设置。可选，默认为 false。
    "add": true
}
```

数据生成期间，以所需数值提供器及可选的 `add` 布尔值调用 `SetItemDamageFunction#setDamage`，为此函数构造 builder。

## `minecraft:set_attributes`

向结果 ItemStack 添加[属性修改器][attributemodifier]列表。

```json5
{
    "function": "minecraft:set_attributes",
    // 属性修饰符列表。
    "modifiers": [
        {
            // 修改器的资源位置 ID。应以你的模组 ID 为前缀。
            "id": "examplemod:example_modifier",
            // 修饰符所针对的属性的 ID。
            "attribute": "minecraft:attack_damage",
            // 属性修饰符操作。
            // 有效值为 "add_value"、"add_multiplied_base" 和 "add_multiplied_total"。
            "operation": "add_value",
            // 改性剂的量。这也可以是数值提供器。
            "amount": 5,
            // 修饰符适用的槽位。有效值为 "any"（任意物品栏槽位）、
            // "mainhand"、"offhand"、"hand"、（mainhand/offhand/both 手）、
            // "feet"、"legs"、"chest"、"head"、"armor"（boots/leggings/chestplates/helmets/any盔甲槽）
            // 和 "body"（马盔甲和类似槽位）。
            "slot": "armor"
        }
    ],
    // 是否替换现有值，而非追加到现有值。可选，默认为 true。
    "replace": false
}
```

数据生成期间，调用 `SetAttributesFunction#setAttributes` 为此函数构造 builder。随后在 builder 上使用 `#withModifier` 添加修改器；使用 `SetAttributesFunction#modifier` 获取修改器。

## `minecraft:set_potion`

在结果 ItemStack 上设置药水。

```json5
{
    "function": "minecraft:set_potion",
    // 药水 ID。
    "id": "minecraft:strength"
}
```

数据生成期间，以所需药水调用 `SetPotionFunction#setPotion`，为此函数构造 builder。

## `minecraft:set_random_dyes`

向结果 ItemStack 应用随机数量的染料，并将结果颜色存储在 `DataComponents#DYED_COLOR` 中。

```json5
{
    "function": "minecraft:set_random_dyes",
    // 应用于结果的染料数量的数值提供器。
    "number_of_dyes": 3
}
```

数据生成期间，以染料数量调用 `SetRandomDyesFunction#withCount`，为此函数构造 builder。

## `minecraft:set_random_potion`

从可用选项中为结果 ItemStack 设置随机药水。如果没有可用选项，则选择任意已注册药水。

```json5
{
    "function": "minecraft:set_random_potion",
    // 可供选择的药水。
    // 可以是药水 ID，例如 "minecraft:strength"，
    // 或药水 ID 列表，例如 ["minecraft:strength", "minecraft:night_vision", ...],
    // 或药水标签，例如 "#minecraft:tradeable"。
    "options": "minecraft:strength"
}
```

数据生成期间，以可选的药水 `HolderSet` 调用 `SetRandomPotionFunction#fromTagKey`，为此函数构造 builder。

## `minecraft:set_stew_effect`

在结果 ItemStack 上设置炖菜效果列表。

```json5
{
    "function": "minecraft:set_stew_effect",
    // 要设置的效果。
    "effects": [
        {
        // 效果 ID。
        "type": "minecraft:fire_resistance",
        // 效果持续时间，以 tick 为单位；也可以使用数值提供器。
        "duration": 100
        }
    ]
}
```

数据生成期间，调用 `SetStewEffectFunction#stewEffect` 为此函数构造 builder。随后在 builder 上调用 `#withModifier`。

## `minecraft:set_ominous_bottle_amplifier`

在结果 ItemStack 上设置不祥之瓶的效果倍率。使用[数值提供器][numberprovider]。

```json5
{
    "function": "minecraft:set_ominous_bottle_amplifier",
    // 要使用的放大器。
    "amplifier": {
        "type": "minecraft:uniform",
        "min": 1,
        "max": 3
    }
}
```

数据生成期间，以所需数值提供器调用 `SetOminousBottleAmplifierFunction#setAmplifier`，为此函数构造 builder。

## `minecraft:exploration_map`

当且仅当结果 ItemStack 是地图时，将其转换为探险家地图。它需要 `minecraft:origin` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:exploration_map",
    // 结构标签，包含探索映射可以通向的结构。
    // 可选，默认为"minecraft:on_treasure_maps"，默认只包含埋藏宝藏。
    "destination": "minecraft:eye_of_ender_located",
    // 要使用的映射装饰类型。有关可用值，请参阅 MapDecorationTypes 类。
    // 可选，默认为 "minecraft:mansion"。
    "decoration": "minecraft:target_x",
    // 要使用的缩放级别。 可选，默认为2。
    "zoom": 4,
    // 要使用的搜索半径。 可选，默认为 50。
    "search_radius": 25,
    // 搜索结构时是否跳过现有区块。 可选，默认为true。
    "skip_existing_chunks": true
}
```

数据生成期间，调用 `ExplorationMapFunction#makeExplorationMap` 为此函数构造 builder。随后可按需调用 builder 上的各种 setter。

## `minecraft:fill_player_head`

根据给定[目标 Entity][entitytarget]，在结果 ItemStack 上设置玩家头颅所有者。它需要对应的战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:fill_player_head",
    // 要使用的 Entity target。如果未解析为 Player，则不会修改 ItemStack。
    "entity": "this_entity"
}
```

数据生成期间，以所需目标 Entity 调用 `FillPlayerHead#fillPlayerHead`，为此函数构造 builder。

## `minecraft:set_banner_pattern`

在结果 ItemStack 上设置旗帜图案。此函数面向旗帜，而非旗帜图案 Item。

```json5
{
    "function": "minecraft:set_banner_patterns",
    // 横幅图案图层列表。
    "patterns": [
        {
            // 要使用的横幅图案的 ID。
            "pattern": "minecraft:globe",
            // 图层的染料颜色。
            "color": "light_blue"
        }
    ],
    // 是否追加到现有图层而不是替换它们。
    "append": true
}
```

数据生成期间，以 `append` 布尔值调用 `SetBannerPatternFunction#setBannerPattern`，为此函数构造 builder。随后调用 `#addPattern` 向函数添加图案。

## `minecraft:set_instrument`

在结果 ItemStack 上设置乐器标签。

```json5
{
    "function": "minecraft:set_instrument",
    // 要使用的仪器标签。
    // 可以是仪器 ID，例如 "minecraft:admire_goat_horn"，
    // 或乐器 ID 列表，例如 ["minecraft:admire_goat_horn", "minecraft:seek_goat_horn", ...]，
    // 或仪器标签，例如 "#minecraft:goat_horns"。
    "options": "#minecraft:goat_horns"
}
```

数据生成期间，以乐器 `HolderSet` 调用 `SetInstrumentFunction#setInstrumentOptions`，为此函数构造 builder。

## `minecraft:set_fireworks`

```json5
{
    "function": "minecraft:set_fireworks",
    // 爆炸使用。 可选，如果不存在，则使用现有数据组件值。
    "explosions": [
        {
            // 使用的烟花爆炸形状。有效的原版值为 "small_ball"、"large_ball"、
            // "star"、"creeper" 和 "burst"。 可选，默认为"small_ball"。
            "shape": "star",
            // 要使用的颜色。 可选，默认为空列表。
            "colors": [
                16711680,
                65280
            ],
            // 要使用的淡入淡出颜色。 可选，默认为空列表。
            "fade_colors": [
                65280,
                255
            ],
            // 爆炸是否有痕迹。 可选，默认为false。
            "has_trail": true,
            // 爆炸是否有闪烁。 可选，默认为false。
            "has_twinkle": true
        }
    ],
    // 烟花的飞行持续时间。 可选，如果不存在，则使用现有数据组件值。
    "flight_duration": 5
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_firework_explosion`

在结果 ItemStack 上设置烟花爆炸效果。

```json5
{
    "function": "minecraft:set_firework_explosion",
    // 使用的烟花爆炸形状。有效的原版值为 "small_ball"、"large_ball"、
    // "star"、"creeper" 和 "burst"。 可选，默认为"small_ball"。
    "shape": "star",
    // 要使用的颜色。 可选，默认为空列表。
    "colors": [
        16711680,
        65280
    ],
    // 要使用的淡入淡出颜色。 可选，默认为空列表。
    "fade_colors": [
        65280,
        255
    ],
    // 爆炸是否有痕迹。 可选，默认为false。
    "trail": true,
    // 爆炸是否有闪烁。 可选，默认为false。
    "twinkle": true
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_book_cover`

设置成书中不特定于页面的内容。

```json5
{
    "function": "minecraft:set_book_cover",
    // 书名。 可选，如果不存在，则书名不变。
    "title": "Hello World!",
    // 本书作者。 可选，如果缺席，书籍作者不变。
    "author": "Steve",
    // 书代，即它被复制的频率。限制在 0 和 3 之间。
    // 可选，如果不存在，则书籍生成保持不变。
    "generation": 2
}
```

数据生成期间，以所需参数调用 `new SetBookCoverFunction`，为此函数构造 builder。

## `minecraft:set_written_book_pages`

设置成书的页面。

```json5
{
    "function": "minecraft:set_written_book_pages",
    // 要设置的页面，作为字符串列表。
    "pages": [
        "Hello World!",
        "Hello World on page 2!",
        "Never Gonna Give You Up!"
    ],
    // 使用的合并模式。有效值为：
    // - "append"：将条目附加到任何现有的传说条目中。
    // - "insert"：在特定位置插入条目。该位置被表示为附加字段
    //   命名为 "offset"。 "offset" 可选，默认为 0。
    // - "replace_all"：删除所有以前的条目，然后追加这些条目。
    // - "replace_section"：删除一部分条目，然后在该位置添加条目。
    //   删除的部分通过 "offset" 和可选的 "size" 字段表示。
    //   如果省略 "size"，则使用 "lore" 中的行数。
    "mode": {
        "type": "insert",
        "offset": 0
    }
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_writable_book_pages`

设置可书写的书（书与笔）的页面。

```json5
{
    "function": "minecraft:set_writable_book_pages",
    // 要设置的页面，作为字符串列表。
    "pages": [
        "Hello World!",
        "Hello World on page 2!",
        "Never Gonna Give You Up!"
    ],
    // 使用的合并模式。有效值为：
    // - "append"：将条目附加到任何现有的传说条目中。
    // - "insert"：在特定位置插入条目。该位置被表示为附加字段
    //   命名为 "offset"。 "offset" 可选，默认为 0。
    // - "replace_all"：删除所有以前的条目，然后追加这些条目。
    // - "replace_section"：删除一部分条目，然后在该位置添加条目。
    //   删除的部分通过 "offset" 和可选的 "size" 字段表示。
    //   如果省略 "size"，则使用 "lore" 中的行数。
    "mode": {
        "type": "insert",
        "offset": 0
    }
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_custom_model_data`

设置结果 ItemStack 在渲染时使用的自定义模型数据。

```json5
{
    "function": "minecraft:set_custom_model_data",
    // 在指定索引的物品模型选择期间使用的 float
    // 具有 `minecraft:custom_model_data` 范围 property 的客户端物品。
    "floats": [
        // 当 "index": 0 时会选择 property 小于 0.5 的模型
        0.5,
        // 当 "index": 1 时，会选择 property 小于 0.25 的模型
        0.25
    ],
    // 在指定索引的物品模型选择期间使用的 boolean
    // 具有 `minecraft:custom_model_data` 条件 property 的客户端物品。
    "flags": [
        // 当 "index": 0 时，会选择条件为 true 的模型
        true,
        // 当 "index": 1 时，将选择条件为 false 的模型
        false
    ],
    // 指定索引的物品模型选择时使用的字符串
    // 用于具有 `minecraft:custom_model_data` 选择 property 的客户端物品。
    "strings": [
        // 当 "index": 0 时，选择 "dummy" 分支对应的模型
        "dummy",
        // 当 "index": 1 时，选择 "example" 分支对应的模型
        "example"
    ],
    // 用于客户端物品的指定索引的色调颜色
    // 带有 `minecraft:custom_model_data` 色调源。
    // 0xFF000000 是 ORed，其中此值表示不透明颜色。
    "colors": [
        // 当"index"：0时为蓝色
        255,
        // 当 "index": 1 时呈绿色
        65280
    ]
}
```

数据生成期间，以条件列表及可选的数值提供器、布尔值、字符串和数值提供器调用 `new SetCustomModelDataFunction()`，构造相应对象。

## `minecraft:filtered`

此函数接受一个 `ItemPredicate`，并针对生成的 ItemStack 进行检查。根据检查成功（`on_pass`）或失败（`on_fail`），运行相应的已定义函数。`ItemPredicate` 可以指定有效 Item id 列表（`items`）、Item 数量的最小/最大范围（`count`）、`DataComponentPredicate`（`components`）以及 `ItemSubPredicate` Map（`predicates`）；所有字段均为可选。

```json5
{
    "function": "minecraft:filtered",
    // 要使用的自定义模型数据值。这也可以是数值提供器。
    "item_filter": {
        "items": [
            "minecraft:diamond_shovel"
        ]
    },
    // 谓词成功时运行的掠夺函数。
    // 战利品修改器文件或内联函数列表。
    "on_pass": "examplemod:example_pass",
    // 谓词失败时运行的掠夺函数。
    // 战利品修改器文件或内联函数列表。
    "on_fail": "examplemod:example_fail"
}
```

目前无法在数据生成期间创建此函数。

:::warning
通常应将此函数视为已弃用。请改为将传入函数与 `minecraft:match_tool` 条件配合使用。
:::

## `minecraft:reference`

此函数引用 Item 修改器，并将其应用到结果 ItemStack。更多信息请参阅 [Item 修改器][itemmodifiers]。

```json5
{
    "function": "minecraft:reference",
    // 指 data/examplemod/item_modifier/example_modifier.json 处的物品修改器文件。
    "name": "examplemod:example_modifier"
}
```

数据生成期间，以所引用谓词文件的 id 调用 `FunctionReference#functionReference`，为此函数构造 builder。

## `minecraft:sequence`

此函数依次运行其他战利品函数。

```json5
{
    "function": "minecraft:sequence",
    // 要运行的函数列表。
    "functions": [
        {
            "function": "minecraft:set_count",
            // ...
        },
        {
            "function": "minecraft:explosion_decay"
        }
    ],
}
```

数据生成期间，以其他函数调用 `SequenceFunction#of`，为此函数构造 builder。

## `minecraft:discard`

此函数丢弃原始 ItemStack，并返回空 Item。

```json5
{
    "function": "minecraft:discard"
}
```

数据生成期间，以其他函数调用 `DiscardItem#discardItem`，为此函数构造 builder。


## 另请参阅

- [Minecraft Wiki][mcwiki] 上的 [Item 修改器][itemmodifiers]

[at]: ../../../advanced/accesstransformers.md
[attributemodifier]: ../../../entities/attributes.md#attribute-modifiers
[component]: ../../client/i18n.md#components
[conditions]: lootconditions
[custom]: custom.md#custom-loot-functions
[datacomponent]: ../../../items/datacomponents.md
[entitytarget]: index.md#entity-targets
[entry]: index.md#loot-entry
[itemmodifiers]: https://minecraft.wiki/w/Item_modifier#JSON_format
[mcwiki]: https://minecraft.wiki
[nbt]: ../../../datastorage/nbt.md
[numberprovider]: index.md#number-provider
[pool]: index.md#loot-pool
[table]: index.md#loot-table
