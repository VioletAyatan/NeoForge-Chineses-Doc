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
    // The item to use.
    "item": "minecraft:dirt"
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_count`

设置结果 ItemStack 使用的 Item 数量。使用[数值提供器][numberprovider]。

```json5
{
    "function": "minecraft:set_count",
    // The count to use.
    "count": {
        "type": "minecraft:uniform",
        "min": 1,
        "max": 3
    },
    // Whether to add to the existing value instead of setting it. Optional, defaults to false.
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
    // The limit to use. Can have a min, a max, or both.
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
    // The source to use. Valid values are either an entity target, "block_entity" to use the loot context's
    // block entity parameter, or be "storage" for command storage. If this is "storage", it can instead be a
    // JSON object that additionally specify the command storage path to be used.
    "source": "this",
    // Example for using "storage".
    "source": {
        "type": "storage",
        "source": "examplepath"
    },
    // The copy operation(s).
    "ops": [
        {
            // The source and target paths. In this example, we copy from "src" in the source to "dest" in the target.
            "source": "src",
            "target": "dest",
            // A merging strategy. Valid values are "replace", "append", and "merge".
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
    // Any component can be used. In this example, we set the dyed color of the item to red.
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
    // One of the loot params specified in the context
    // For entities: 'this', 'attacker', 'direct_attacker', 'attacking_player', 'target_entity', 'interacting_entity'
    // For block entities: 'block_entity'
    // For item stacks: 'tool'
    "source": "block_entity",
    // By default, all components are copied. The "exclude" list allows excluding certain components, and the
    // "include" list allows explicitly re-including components. Both fields are optional.
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
    // The expected block. If this does not match the block that is actually broken, the function does not run.
    "block": "minecraft:oak_slab",
    // The block state properties to save.
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
    // The contents component to use. Valid values are "container", "bundle_contents" and "charged_projectiles".
    "component": "container",
    // A list of loot entries to add to the contents.
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
    // The contents component to use. Valid values are "container", "bundle_contents" and "charged_projectiles".
    "component": "container",
    // The function to use.
    "modifier": "apply_explosion_decay"
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_loot_table`

在结果 ItemStack 上设置容器战利品表。它适用于箱子及其他放置后仍保留此属性的战利品容器。

```json5
{
    "function": "minecraft:set_loot_table",
    // The id of the loot table to use.
    "name": "minecraft:entities/enderman",
    // The id of the block entity type of the target block entity.
    "type": "minecraft:chest",
    // The random seed for generating loot tables. Optional, defaults to 0.
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
    // The entity target to use.
    "entity": "this",
    // Whether to set the custom name ("custom_name") or the item name ("item_name") itself.
    // Custom name are displayed in italics and can be changed in an anvil, while item names cannot.
    "target": "custom_name"
}
```

数据生成期间，以所需名称组件、名称目标及可选目标 Entity 调用 `SetNameFunction#setName`，为此函数构造 builder。

## `minecraft:copy_name`

将[目标 Entity][entitytarget] 或 BlockEntity 的名称复制到结果 ItemStack。它需要与指定来源（目标 Entity 或 BlockEntity）对应的战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:copy_name",
    // The entity target, or "block_entity" if a block entity's name should be copied.
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
    // The merging mode used. Valid values are:
    // - "append": Appends the entries to any existing lore entries.
    // - "insert": Inserts the entries at a certain position. The position is denoted as an additional field
    //   named "offset". "offset" is optional and defaults to 0.
    // - "replace_all": Removes all previous entries and then appends the entries.
    // - "replace_section": Removes a section of entries and then adds the entries at that position.
    //   The section removed is denoted through the "offset" and optional "size" fields.
    //   If "size" is omitted, the amount of lines in "lore" is used.
    "mode": {
        "type": "insert",
        "offset": 0
    },
    // The entity target to use.
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
        // All values are optional. If omitted, these values will use pre-existing values on the stack.
        // The pre-existing values are generally true, unless they have already been modified by another function.
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
    // The amount of levels to use.
    "levels": {
        "type": "minecraft:uniform",
        "min": 10,
        "max": 30
    },
    // A list of possible enchantments. Optional, defaults to all applicable enchantments for the item.
    "options": [
        "minecraft:sharpness",
        "minecraft:fire_aspect"
    ],
    // Whether to allow this function to apply an additional trade cost if successful.
    "include_additional_cost_component": true
}
```

数据生成期间，以所需数值提供器调用 `EnchantWithLevelsFunction#enchantWithLevels`，为此函数构造 builder。随后可按需使用 `#fromOptions` 在 builder 上设置附魔列表。

## `minecraft:enchant_randomly`

为 Item 添加一个随机附魔。

```json5
{
    "function": "minecraft:enchant_randomly",
    // A list of possible enchantments. Optional, defaults to all enchantments.
    "options": [
        "minecraft:sharpness",
        "minecraft:fire_aspect"
    ],
    // Whether to only allow compatible enchantments, or any enchantments. Optional, defaults to true.
    "only_compatible": true,
    // Whether to allow this function to apply an additional trade cost if successful.
    "include_additional_cost_component": true
}
```

数据生成期间，调用 `EnchantRandomlyFunction#randomEnchantment` 或 `EnchantRandomlyFunction#randomApplicableEnchantment`，为此函数构造 builder。随后可按需在 builder 上调用 `#withEnchantment`、`#withOneOf` 或 `#withOptions`。

## `minecraft:set_enchantments`

在结果 ItemStack 上设置附魔。

```json5
{
    "function": "minecraft:set_enchantments",
    // A map of enchantments to number providers.
    "enchantments": {
        "minecraft:fire_aspect": 2,
        "minecraft:sharpness": {
        "type": "minecraft:uniform",
        "min": 3,
        "max": 5,
        }
    },
    // Whether to add enchantment levels to existing levels instead of overwriting them. Optional, defaults to false.
    "add": true
}
```

数据生成期间，以可选的 `add` 布尔值调用 `new SetEnchantmentsFunction.Builder`，为此函数构造 builder。随后调用 `#withEnchantment` 添加要设置的附魔。

## `minecraft:enchanted_count_increase`

根据附魔值增加 ItemStack 数量。使用[数值提供器][numberprovider]。它需要 `minecraft:attacking_entity` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:enchanted_count_increase",
    // The enchantment to use.
    "enchantment": "minecraft:fortune",
    // The increase count per level. The number provider is rolled once per function, not once per level.
    "count": {
        "type": "minecraft:uniform",
        "min": 1,
        "max": 3
    },
    // The stack size limit, which will not be exceeded no matter the enchantment level. Optional.
    "limit": 5
}
```

数据生成期间，以所需数值提供器调用 `EnchantedCountIncreaseFunction#lootingMultiplier`，为此函数构造 builder。之后可选择在 builder 上调用 `#setLimit`。

## `minecraft:apply_bonus`

根据附魔值与不同公式增加 ItemStack 数量。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:apply_bonus",
    // The enchantment value to query.
    "enchantment": "minecraft:fortune",
    // The formula to use. Valid values are:
    // - "minecraft:binomial_with_bonus_count": Applies a bonus based on a binomial distribution with
    //   n = enchantment level + extra and p = probability.
    // - "minecraft:ore_drops": Applies a bonus based on a special formula for ore drops, including randomness.
    // - "minecraft:uniform_bonus_count": Adds a bonus based on the enchantment level scaled by a constant multiplier.
    "formula": "ore_drops",
    // The parameter values, depending on the formula.
    // If the formula is "minecraft:binomial_with_bonus_count", requires "extra" and "probability".
    // If the formula is "minecraft:ore_drops", requires no parameters.
    // If the formula is "minecraft:uniform_bonus_count", requires "bonusMultiplier".
    "parameters": {}
}
```

数据生成期间，根据公式，以附魔及其他必需参数调用 `ApplyBonusCount#addBonusBinomialDistributionCount`、`ApplyBonusCount#addOreBonusCount` 或 `ApplyBonusCount#addUniformBonusCount`，为此函数构造 builder。

## `minecraft:furnace_smelt`

尝试像在熔炉中一样烧炼 Item；如果无法烧炼，则返回未经修改的 ItemStack。

```json5
{
    "function": "minecraft:furnace_smelt",
    // When true, will use the current input material to determine
    // the base count. Otherwise, will output one result.
    "use_input_count": true
}
```

数据生成期间，调用 `SmeltItemFunction#smelted` 为此函数构造 builder。

## `minecraft:set_damage`

在结果 ItemStack 上设置耐久损耗值。使用[数值提供器][numberprovider]。

```json5
{
    "function": "minecraft:set_damage",
    // The damage to set.
    "damage": {
        "type": "minecraft:uniform",
        "min": 10,
        "max": 300
    },
    // Whether to add to the existing damage instead of setting it. Optional, defaults to false.
    "add": true
}
```

数据生成期间，以所需数值提供器及可选的 `add` 布尔值调用 `SetItemDamageFunction#setDamage`，为此函数构造 builder。

## `minecraft:set_attributes`

向结果 ItemStack 添加[属性修改器][attributemodifier]列表。

```json5
{
    "function": "minecraft:set_attributes",
    // A list of attribute modifiers.
    "modifiers": [
        {
            // The resource location id of the modifier. Should be prefixed by your mod id.
            "id": "examplemod:example_modifier",
            // The id of the attribute the modifier is for.
            "attribute": "minecraft:attack_damage",
            // The attribute modifier operation.
            // Valid values are "add_value", "add_multiplied_base" and "add_multiplied_total". 
            "operation": "add_value",
            // The amount of the modifier. This can also be a number provider.
            "amount": 5,
            // The slot(s) the modifier applies for. Valid values are "any" (any inventory slot),
            // "mainhand", "offhand", "hand", (mainhand/offhand/both hands),
            // "feet", "legs", "chest", "head", "armor" (boots/leggings/chestplates/helmets/any armor slots)
            // and "body" (horse armor and similar slots).
            "slot": "armor"
        }
    ],
    // Whether to replace the existing values instead of adding to them. Optional, defaults to true.
    "replace": false
}
```

数据生成期间，调用 `SetAttributesFunction#setAttributes` 为此函数构造 builder。随后在 builder 上使用 `#withModifier` 添加修改器；使用 `SetAttributesFunction#modifier` 获取修改器。

## `minecraft:set_potion`

在结果 ItemStack 上设置药水。

```json5
{
    "function": "minecraft:set_potion",
    // The id of the potion.
    "id": "minecraft:strength"
}
```

数据生成期间，以所需药水调用 `SetPotionFunction#setPotion`，为此函数构造 builder。

## `minecraft:set_random_dyes`

向结果 ItemStack 应用随机数量的染料，并将结果颜色存储在 `DataComponents#DYED_COLOR` 中。

```json5
{
    "function": "minecraft:set_random_dyes",
    // A number provider of the number of dyes to apply to the result.
    "number_of_dyes": 3
}
```

数据生成期间，以染料数量调用 `SetRandomDyesFunction#withCount`，为此函数构造 builder。

## `minecraft:set_random_potion`

从可用选项中为结果 ItemStack 设置随机药水。如果没有可用选项，则选择任意已注册药水。

```json5
{
    "function": "minecraft:set_random_potion",
    // The potions to choose from.
    // Can either be a potion id, such as "minecraft:strength",
    // or a list of potion ids, such as ["minecraft:strength", "minecraft:night_vision", ...],
    // or a potion tag, such as "#minecraft:tradeable".
    "options": "minecraft:strength"
}
```

数据生成期间，以可选的药水 `HolderSet` 调用 `SetRandomPotionFunction#fromTagKey`，为此函数构造 builder。

## `minecraft:set_stew_effect`

在结果 ItemStack 上设置炖菜效果列表。

```json5
{
    "function": "minecraft:set_stew_effect",
    // The effects to set.
    "effects": [
        {
        // The effect id.
        "type": "minecraft:fire_resistance",
        // The effect duration, in ticks. This can also be a number provider.
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
    // The amplifier to use.
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
    // A structure tag, containing the structures an exploration map can lead to.
    // Optional, defaults to "minecraft:on_treasure_maps", which only contains buried treasures by default.
    "destination": "minecraft:eye_of_ender_located",
    // The map decoration type to use. See the MapDecorationTypes class for available values.
    // Optional, defaults to "minecraft:mansion".
    "decoration": "minecraft:target_x",
    // The zoom level to use. Optional, defaults to 2.
    "zoom": 4,
    // The search radius to use. Optional, defaults to 50.
    "search_radius": 25,
    // Whether existing chunks are skipped when searching for structures. Optional, defaults to true.
    "skip_existing_chunks": true
}
```

数据生成期间，调用 `ExplorationMapFunction#makeExplorationMap` 为此函数构造 builder。随后可按需调用 builder 上的各种 setter。

## `minecraft:fill_player_head`

根据给定[目标 Entity][entitytarget]，在结果 ItemStack 上设置玩家头颅所有者。它需要对应的战利品参数；如果该参数缺失，则不执行修改。

```json5
{
    "function": "minecraft:fill_player_head",
    // The entity target to use. If this doesn't resolve to a player, the stack is not modified.
    "entity": "this_entity"
}
```

数据生成期间，以所需目标 Entity 调用 `FillPlayerHead#fillPlayerHead`，为此函数构造 builder。

## `minecraft:set_banner_pattern`

在结果 ItemStack 上设置旗帜图案。此函数面向旗帜，而非旗帜图案 Item。

```json5
{
    "function": "minecraft:set_banner_patterns",
    // A list of banner pattern layers.
    "patterns": [
        {
            // The id of the banner pattern to use.
            "pattern": "minecraft:globe",
            // The dye color of the layer.
            "color": "light_blue"
        }
    ],
    // Whether to append to the existing layers instead of replacing them.
    "append": true
}
```

数据生成期间，以 `append` 布尔值调用 `SetBannerPatternFunction#setBannerPattern`，为此函数构造 builder。随后调用 `#addPattern` 向函数添加图案。

## `minecraft:set_instrument`

在结果 ItemStack 上设置乐器标签。

```json5
{
    "function": "minecraft:set_instrument",
    // The instrument tag to use.
    // Can either be an instrument id, such as "minecraft:admire_goat_horn",
    // or a list of instrument ids, such as ["minecraft:admire_goat_horn", "minecraft:seek_goat_horn", ...],
    // or a instrument tag, such as "#minecraft:goat_horns".
    "options": "#minecraft:goat_horns"
}
```

数据生成期间，以乐器 `HolderSet` 调用 `SetInstrumentFunction#setInstrumentOptions`，为此函数构造 builder。

## `minecraft:set_fireworks`

```json5
{
    "function": "minecraft:set_fireworks",
    // The explosions to use. Optional, uses the existing data component value if absent.
    "explosions": [
        {
            // The firework explosion shape to use. Valid vanilla values are "small_ball", "large_ball",
            // "star", "creeper" and "burst". Optional, defaults to "small_ball".
            "shape": "star",
            // The colors to use. Optional, defaults to an empty list.
            "colors": [
                16711680,
                65280
            ],
            // The fade colors to use. Optional, defaults to an empty list.
            "fade_colors": [
                65280,
                255
            ],
            // Whether the explosion has a trail. Optional, defaults to false.
            "has_trail": true,
            // Whether the explosion has a twinkle. Optional, defaults to false.
            "has_twinkle": true
        }
    ],
    // The flight duration of the fireworks. Optional, uses the existing data component value if absent.
    "flight_duration": 5
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_firework_explosion`

在结果 ItemStack 上设置烟花爆炸效果。

```json5
{
    "function": "minecraft:set_firework_explosion",
    // The firework explosion shape to use. Valid vanilla values are "small_ball", "large_ball",
    // "star", "creeper" and "burst". Optional, defaults to "small_ball".
    "shape": "star",
    // The colors to use. Optional, defaults to an empty list.
    "colors": [
        16711680,
        65280
    ],
    // The fade colors to use. Optional, defaults to an empty list.
    "fade_colors": [
        65280,
        255
    ],
    // Whether the explosion has a trail. Optional, defaults to false.
    "trail": true,
    // Whether the explosion has a twinkle. Optional, defaults to false.
    "twinkle": true
}
```

目前无法在数据生成期间创建此函数。

## `minecraft:set_book_cover`

设置成书中不特定于页面的内容。

```json5
{
    "function": "minecraft:set_book_cover",
    // The book title. Optional, if absent, the book title remains unchanged.
    "title": "Hello World!",
    // The book author. Optional, if absent, the book author remains unchanged.
    "author": "Steve",
    // The book generation, i.e. how often it has been copied. Clamped between 0 and 3.
    // Optional, if absent, the book generation remains unchanged.
    "generation": 2
}
```

数据生成期间，以所需参数调用 `new SetBookCoverFunction`，为此函数构造 builder。

## `minecraft:set_written_book_pages`

设置成书的页面。

```json5
{
    "function": "minecraft:set_written_book_pages",
    // The pages to set, as a list of strings.
    "pages": [
        "Hello World!",
        "Hello World on page 2!",
        "Never Gonna Give You Up!"
    ],
    // The merging mode used. Valid values are:
    // - "append": Appends the entries to any existing lore entries.
    // - "insert": Inserts the entries at a certain position. The position is denoted as an additional field
    //   named "offset". "offset" is optional and defaults to 0.
    // - "replace_all": Removes all previous entries and then appends the entries.
    // - "replace_section": Removes a section of entries and then adds the entries at that position.
    //   The section removed is denoted through the "offset" and optional "size" fields.
    //   If "size" is omitted, the amount of lines in "lore" is used.
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
    // The pages to set, as a list of strings.
    "pages": [
        "Hello World!",
        "Hello World on page 2!",
        "Never Gonna Give You Up!"
    ],
    // The merging mode used. Valid values are:
    // - "append": Appends the entries to any existing lore entries.
    // - "insert": Inserts the entries at a certain position. The position is denoted as an additional field
    //   named "offset". "offset" is optional and defaults to 0.
    // - "replace_all": Removes all previous entries and then appends the entries.
    // - "replace_section": Removes a section of entries and then adds the entries at that position.
    //   The section removed is denoted through the "offset" and optional "size" fields.
    //   If "size" is omitted, the amount of lines in "lore" is used.
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
    // The float used during item model selection for the specified index
    // for a client item with a `minecraft:custom_model_data` range property.
    "floats": [
        // Will select the model where the property is less than 0.5 when "index": 0
        0.5,
        // Will select the model where the property is less than 0.25 when "index": 1
        0.25
    ],
    // The boolean used during item model selection for the specified index
    // for a client item with a `minecraft:custom_model_data` condition property.
    "flags": [
        // Will select the model where the condition is true when "index": 0
        true,
        // Will select the model where the condition is false when "index": 1
        false
    ],
    // The string used during item model selection for the specified index
    // for a client item with a `minecraft:custom_model_data` select property.
    "strings": [
        // Will select the model with the "dummy" case when "index": 0
        "dummy",
        // Will select the model with the "example" case when "index": 1
        "example"
    ],
    // The tint color to use for the specified index for a client item
    // with a `minecraft:custom_model_data` tint source.
    // 0xFF000000 is ORed with this value for an opaque color.
    "colors": [
        // Blue when "index": 0
        255,
        // Green when "index": 1
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
    // The custom model data value to use. This can also be a number provider.
    "item_filter": {
        "items": [
            "minecraft:diamond_shovel"
        ]
    },
    // The loot function to run if the predicate succeeds.
    // A loot modifier file or an in-line list of functions.
    "on_pass": "examplemod:example_pass",
    // The loot function to run if the predicate fails.
    // A loot modifier file or an in-line list of functions.
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
    // Refers to the item modifier file at data/examplemod/item_modifier/example_modifier.json.
    "name": "examplemod:example_modifier"
}
```

数据生成期间，以所引用谓词文件的 id 调用 `FunctionReference#functionReference`，为此函数构造 builder。

## `minecraft:sequence`

此函数依次运行其他战利品函数。

```json5
{
    "function": "minecraft:sequence",
    // A list of functions to run.
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
