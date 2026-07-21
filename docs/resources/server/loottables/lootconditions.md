# 战利品条件

战利品条件可用于检查当前上下文中是否应使用[战利品条目][entry]或[战利品池][pool]。两种情况下都会定义一个条件列表；只有所有条件均通过时，才使用该条目或池。在数据生成期间，通过以所需条件的实例调用 `#when`，将条件添加到 `LootPoolEntryContainer.Builder<?>` 或 `LootPool.Builder`。本文将介绍可用的战利品条件。要创建自己的战利品条件，请参阅[自定义战利品条件][custom]。

## `minecraft:inverted`

此条件接受另一个条件并将其结果取反。它需要另一个条件所需的所有战利品参数。

```json5
{
    "condition": "minecraft:inverted",
    "term": {
        // Some other loot condition.
    }
}
```

数据生成期间，以要取反的条件调用 `InvertedLootItemCondition#invert`，为此条件构造 builder。

## `minecraft:all_of`

此条件接受任意数量的其他条件；如果所有子条件均返回 true，它就返回 true。如果列表为空，则返回 false。它需要其他条件所需的所有战利品参数。

```json5
{
    "condition": "minecraft:all_of",
    "terms": [
        {
            // A loot condition.
        },
        {
            // Another loot condition.
        },
        {
            // Yet another loot condition.
        }
    ]
}
```

数据生成期间，以所需条件调用 `AllOfCondition#allOf`，为此条件构造 builder。

## `minecraft:any_of`

此条件接受任意数量的其他条件；如果至少一个子条件返回 true，它就返回 true。如果列表为空，则返回 false。它需要其他条件所需的所有战利品参数。

```json5
{
    "condition": "minecraft:any_of",
    "terms": [
        {
            // A loot condition.
        },
        {
            // Another loot condition.
        },
        {
            // Yet another loot condition.
        }
    ]
}
```

数据生成期间，以所需条件调用 `AnyOfCondition#anyOf`，为此条件构造 builder。

## `minecraft:random_chance`

此条件接受一个表示 0 到 1 之间概率的[数值提供器][numberprovider]，并根据该概率随机返回 true 或 false。数值提供器通常不应返回 `[0, 1]` 区间以外的值。

```json5
{
    "condition": "minecraft:random_chance",
    // A constant 50% chance for the condition to apply. 
    "chance": 0.5
}
```

数据生成期间，以数值提供器或（常量）float 值调用 `LootItemRandomChanceCondition#randomChance`，为此条件构造 builder。

## `minecraft:random_chance_with_enchanted_bonus`

此条件接受附魔 id、[`LevelBasedValue`][numberprovider] 和一个常量备用 float 值。如果存在指定附魔，则从 `LevelBasedValue` 查询值；如果指定附魔不存在，或无法从 `LevelBasedValue` 取得值，则使用常量备用值。随后条件随机返回 true 或 false，先前确定的值表示返回 true 的概率。它需要 `minecraft:attacking_entity` 参数；若缺失，则回退到等级 0。

```json5
{
    "condition": "minecraft:random_chance_with_enchanted_bonus",
    // Add a 20% chance per looting level to succeed.
    "enchantment": "minecraft:looting",
    "enchanted_chance": {
        "type": "linear",
        "base": 0.2,
        "per_level_above_first": 0.2
    },
    // Always fail if the looting enchantment is not present.
    "unenchanted_chance": 0.0
}
```

数据生成期间，以 Registry 查询（`HolderLookup.Provider`）、基础值和每级增量调用 `LootItemRandomChanceWithEnchantedBonusCondition#randomChanceAndLootingBoost`，为此条件构造 builder。也可以调用 `new LootItemRandomChanceWithEnchantedBonusCondition` 进一步指定各值。

## `minecraft:value_check`

此条件接受[数值提供器][numberprovider]与 `IntRange`；如果提供的数值结果位于该范围内，则返回 true。

```json5
{
    "condition": "minecraft:value_check",
    // May be any number provider.
    "value": {
        "type": "minecraft:uniform",
        "min": 0.0,
        "max": 10.0
    },
    // A range with min/max values.
    "range": {
        "min": 2.0,
        "max": 5.0
    }
}
```

数据生成期间，以数值提供器和范围调用 `ValueCheckCondition#hasValue`，为此条件构造 builder。

## `minecraft:time_check`

此条件检查给定 `WorldClock` 是否位于 `IntRange` 中。可以选择提供 `period` 参数，对时间取模；例如，当 `period` 为 24000 时，可用于检查 `minecraft:overworld` 中的一日时刻（一个游戏内昼夜周期为 24000 tick）。

```json5
{
    "condition": "minecraft:time_check",
    // The clock instance to check the time of.
    // Points to a registered clock at `data/<namespace>/world_clock/<path>.json`.
    "clock": "minecraft:overworld",
    // Optional, can be omitted. If omitted, no modulo operation will take place.
    // We use 24000 here, which is the length of one in-game day/night cycle.
    "period": 24000,
    // A range with min/max values. This example checks if the time is between 0 and 12000.
    // Combined with the modulo operand of 24000 specified above, this example checks if it is currently daytime.
    "value": {
        "min": 0,
        "max": 12000
    }
}
```

数据生成期间，以时钟和所需范围调用 `TimeCheck#time`，为此条件构造 builder。随后可在 builder 上使用 `#setPeriod` 设置 `period` 值。

## `minecraft:weather_check`

此条件检查当前天气是否下雨或打雷。

```json5
{
    "condition": "minecraft:weather_check",
    // Optional. If unspecified, the rain state will not be checked.
    "raining": true,
    // Optional. If unspecified, the thundering state will not be checked.
    // Specifying "raining": true and "thundering": true is functionally equivalent to just specifying
    // "thundering": true, since it is always raining when a thunderstorm occurs.
    "thundering": false
}
```

数据生成期间，调用 `WeatherCheck#weather` 为此条件构造 builder。随后可分别使用 `#setRaining` 与 `#setThundering` 在 builder 上设置 `raining` 和 `thundering` 值。

## `minecraft:location_check`

此条件接受 `LocationPredicate`，以及每个轴向上的可选偏移值。`LocationPredicate` 可以检查位置本身、该位置的 BlockState 或流体状态、该位置所属的维度、生物群系或结构、光照等级、天空是否可见等条件。所有可能的值可在 `LocationPredicate` 类定义中查看。它需要 `minecraft:origin` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:location_check",
    "predicate": {
        // Succeed if our target is anywhere in the nether.
        "dimension": "the_nether"
    },
    // Optional position offset values. Only relevant if you are checking the position in some way.
    // Must either be provided all at once, or not at all.
    "offsetX": 10,
    "offsetY": 10,
    "offsetZ": 10
}
```

数据生成期间，以 `LocationPredicate` 以及可选的 `BlockPos` 调用 `LocationCheck#checkLocation`，为此条件构造 builder。

## `minecraft:block_state_property`

此条件检查被破坏的 BlockState 中，指定 BlockState 属性是否具有指定值。它需要 `minecraft:block_state` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:block_state_property",
    // The expected block. If this does not match the block that is actually broken, the condition fails.
    "block": "minecraft:oak_slab",
    // The block state properties to match. Unspecified properties can have either value.
    // In this example, we want to only succeed if a top slab - waterlogged or not - is broken.
    // If this specifies properties not present on the block, a log warning will be printed.
    "properties": {
        "type": "top"
    }
}
```

数据生成期间，以 Block 调用 `LootItemBlockStatePropertyCondition#hasBlockStateProperties`，为此条件构造 builder。随后可使用 `#setProperties` 在 builder 上设置所需的 BlockState 属性值。

## `minecraft:survives_explosion`

此条件会随机摧毁掉落物。掉落物存留的概率为 1 / `explosion_radius` 战利品参数。除信标或龙蛋等极少数例外外，所有 Block 掉落物都使用此函数。它需要 `minecraft:explosion_radius` 战利品参数；如果该参数缺失，则始终成功。

```json5
{
    "condition": "minecraft:survives_explosion"
}
```

数据生成期间，调用 `ExplosionCondition#survivesExplosion` 为此条件构造 builder。

## `minecraft:match_tool`

此条件接受一个 `ItemPredicate`，并将其与 `tool` 战利品参数进行检查。`ItemPredicate` 可以指定有效 Item id 列表（`items`）、Item 数量的最小/最大范围（`count`）、`DataComponentPredicate`（`components`）以及 `ItemSubPredicate` Map（`predicates`）；所有字段均为可选。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:match_tool",
    // Match a netherite pickaxe or axe.
    "predicate": {
        "items": [
            "minecraft:netherite_pickaxe",
            "minecraft:netherite_axe"
        ]
    }
}
```

数据生成期间，以 `ItemPredicate.Builder` 调用 `MatchTool#toolMatches`，为此条件构造 builder。

## `minecraft:enchantment_active`

此条件返回附魔是否处于激活状态。它需要 `minecraft:enchantment_active` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:enchantment_active",
    // Whether the enchantment should be active (true) or not (false).
    "active": true
}
```

数据生成期间，调用 `EnchantmentActiveCheck#enchantmentActiveCheck` 或 `#enchantmentInactiveCheck`，为此条件构造 builder。

## `minecraft:table_bonus`

此条件与 `minecraft:random_chance_with_enchanted_bonus` 类似，但使用固定值而非随机值。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:table_bonus",
    // Apply the bonus if the fortune enchantment is present.
    "enchantment": "minecraft:fortune",
    // The chances to use per level. This example has a 20% chance of succeeding if unenchanted,
    // 30% if enchanted at level 1, and 60% if enchanted at level 2 or above.
    "chances": [0.2, 0.3, 0.6]
}
```

数据生成期间，以附魔 id 和概率调用 `BonusLevelTableCondition#bonusLevelFlatChance`，为此条件构造 builder。

## `minecraft:entity_properties`

此条件针对[目标 Entity][entitytarget] 检查给定 `EntityPredicate`。`EntityPredicate` 可以检查 Entity Type、生物效果、NBT 值、装备、位置等。

```json5
{
    "condition": "minecraft:entity_properties",
    // The entity target to use. Valid values are "this", "attacker", "direct_attacker" or "attacking_player".
    // These correspond to the "this_entity", "attacking_entity", "direct_attacking_entity" and
    // "last_damage_player" loot parameters, respectively.
    "entity": "attacker",
    // Only succeed if the target is a pig. The predicate may also be empty, this can be used
    // to check whether the specified entity target is set at all.
    "predicate": {
        "type": "minecraft:pig"
    }
}
```

数据生成期间，以目标 Entity 调用 `LootItemEntityPropertyCondition#entityPresent`，或以目标 Entity 和 `EntityPredicate` 调用 `LootItemEntityPropertyCondition#hasProperties`，为此条件构造 builder。

## `minecraft:damage_source_properties`

此条件针对 Damage Source 战利品参数检查给定 `DamageSourcePredicate`。它需要 `minecraft:origin` 与 `minecraft:damage_source` 战利品参数；如果这些参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:damage_source_properties",
    "predicate": {
        // Check whether the source entity is a zombie.
        "source_entity": {
            "type": "zombie"
        }
    }
}
```

数据生成期间，以 `DamageSourcePredicate.Builder` 调用 `DamageSourceCondition#hasDamageSource`，为此条件构造 builder。

## `minecraft:killed_by_player`

此条件判断击杀是否由玩家完成。部分 Entity 掉落物会使用它，例如烈焰人掉落的烈焰棒。它需要 `minecraft:last_player_damage` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:killed_by_player"
}
```

数据生成期间，调用 `LootItemKilledByPlayerCondition#killedByPlayer` 为此条件构造 builder。

## `minecraft:entity_scores`

此条件检查[目标 Entity][entitytarget] 的记分板。它需要与指定目标 Entity 对应的战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:entity_scores"
    // The entity target to use. Valid values are "this", "attacker", "direct_attacker" or "attacking_player".
    // These correspond to the "this_entity", "attacking_entity", "direct_attacking_entity" and
    // "last_damage_player" loot parameters, respectively.
    "entity": "attacker",
    // A list of scoreboard values that must be in the given ranges.
    "scores": {
        "score1": {
            "min": 0,
            "max": 100
        },
        "score2": {
            "min": 10,
            "max": 20
        }
    }
}
```

数据生成期间，以目标 Entity 调用 `EntityHasScoreCondition#hasScores`，为此条件构造 builder。随后使用 `#withScore` 向 builder 添加所需分数。

## `minecraft:reference`

此条件引用谓词文件并返回其结果。更多信息请参阅 [Item 谓词][predicate]。

```json5
{
    "condition": "minecraft:reference",
    // Refers to the predicate file at data/examplemod/predicate/example_predicate.json.
    "name": "examplemod:example_predicate"
}
```

数据生成期间，以所引用谓词文件的 id 调用 `ConditionReference#conditionReference`，为此条件构造 builder。

## `minecraft:environment_attribute_check`

此条件检查上下文维度中的环境属性是否与给定值匹配。如果环境属性与位置有关（可随玩家在 Level 中的位置变化），则需要 `minecraft:origin` 战利品参数；如果该参数缺失，则始终失败。如果维度中不存在该属性，则针对默认值进行检查。

```json5
{
    "condition": "minecraft:environment_attribute_check",
    // The environment attribute to check the value of.
    "attribute": "minecraft:gameplay/water_evaporates",
    // The value the environment attribute must be.
    "value": false
}
```

数据生成期间，以已注册的 `EnvironmentAttribute` 及其值调用 `EnvironmentAttributeCheck#environmentAttribute`，为此条件构造 builder。

## `neoforge:loot_table_id`

仅当外围战利品表 id 匹配时，此条件才返回 true。它通常用于[全局战利品修改器][glm]。

```json5
{
    "condition": "neoforge:loot_table_id",
    // Will only apply when the loot table is for dirt
    "loot_table_id": "minecraft:blocks/dirt"
}
```

数据生成期间，以所需战利品表 id 调用 `LootTableIdCondition#builder`，为此条件构造 builder。

## `neoforge:can_item_perform_ability`

仅当 `tool` 战利品上下文参数（`LootContextParams.TOOL`）中的 Item（通常是用于破坏 Block 或击杀 Entity 的 Item）能够执行指定 [`ItemAbility`][itemability] 时，此条件才返回 true。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "neoforge:can_item_perform_ability",
    // Will only apply if the tool can strip a log like an axe
    "ability": "axe_strip"
}
```

数据生成期间，以所需 Item 能力的 id 调用 `CanItemPerformAbility#canItemPerformAbility`，为此条件构造 builder。

## 另请参阅

- [Minecraft Wiki][mcwiki] 上的 [Item 谓词][predicatejson]

[custom]: custom.md#custom-loot-conditions
[entitytarget]: index.md#entity-targets
[entry]: index.md#loot-entry
[glm]: glm.md
[itemability]: ../../../items/tools.md#itemabilitys
[mcwiki]: https://minecraft.wiki
[numberprovider]: index.md#number-provider
[pool]: index.md#loot-pool
[predicate]: https://minecraft.wiki/w/Predicate
[predicatejson]: https://minecraft.wiki/w/Predicate#JSON_format
[registry]: ../../../concepts/registries.md
