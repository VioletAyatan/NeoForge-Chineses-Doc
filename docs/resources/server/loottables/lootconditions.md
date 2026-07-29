# 战利品条件（Loot Conditions）

战利品条件可用于检查当前上下文中是否应使用[战利品条目][entry]或[战利品池][pool]。两种情况下都会定义一个条件列表；只有所有条件均通过时，才使用该条目或池。在数据生成期间，通过以所需条件的实例调用 `#when`，将条件添加到 `LootPoolEntryContainer.Builder<?>` 或 `LootPool.Builder`。本文将介绍可用的战利品条件。要创建自己的战利品条件，请参阅[自定义战利品条件][custom]。

## `minecraft:inverted`

此条件接受另一个条件并将其结果取反。它需要另一个条件所需的所有战利品参数。

```json5
{
    "condition": "minecraft:inverted",
    "term": {
        // 其他一些战利品条件。
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
            // 战利品条件。
        },
        {
            // 另一个战利品条件。
        },
        {
            // 又一个战利品条件。
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
            // 战利品条件。
        },
        {
            // 另一个战利品条件。
        },
        {
            // 又一个战利品条件。
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
    // 条件应用的恒定概率为 50%。
    "chance": 0.5
}
```

数据生成期间，以数值提供器或（常量）float 值调用 `LootItemRandomChanceCondition#randomChance`，为此条件构造 builder。

## `minecraft:random_chance_with_enchanted_bonus`

此条件接受附魔 id、[`LevelBasedValue`][numberprovider] 和一个常量备用 float 值。如果存在指定附魔，则从 `LevelBasedValue` 查询值；如果指定附魔不存在，或无法从 `LevelBasedValue` 取得值，则使用常量备用值。随后条件随机返回 true 或 false，先前确定的值表示返回 true 的概率。它需要 `minecraft:attacking_entity` 参数；若缺失，则回退到等级 0。

```json5
{
    "condition": "minecraft:random_chance_with_enchanted_bonus",
    // 每个抢劫等级增加 20% 的成功几率。
    "enchantment": "minecraft:looting",
    "enchanted_chance": {
        "type": "linear",
        "base": 0.2,
        "per_level_above_first": 0.2
    },
    // 如果掠夺附魔不存在，则总是失败。
    "unenchanted_chance": 0.0
}
```

数据生成期间，以注册表查询（`HolderLookup.Provider`）、基础值和每级增量调用 `LootItemRandomChanceWithEnchantedBonusCondition#randomChanceAndLootingBoost`，为此条件构造 builder。也可以调用 `new LootItemRandomChanceWithEnchantedBonusCondition` 进一步指定各值。

## `minecraft:value_check`

此条件接受[数值提供器][numberprovider]与 `IntRange`；如果提供的数值结果位于该范围内，则返回 true。

```json5
{
    "condition": "minecraft:value_check",
    // 可以是任何数值提供器。
    "value": {
        "type": "minecraft:uniform",
        "min": 0.0,
        "max": 10.0
    },
    // 具有 min/max 值的范围。
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
    // 要检查时间的时钟实例。
    // 指向在 `data/<namespace>/world_clock/<path>.json` 注册的时钟。
    "clock": "minecraft:overworld",
    // 可选，可省略。如果省略，则不会发生模运算。
    // 这里我们使用24000，这是游戏中day/night一个周期的长度。
    "period": 24000,
    // 具有 min/max 值的范围。此示例检查时间是否在 0 到 12000 之间。
    // 结合上面指定的模操作数 24000，此示例检查当前是否为白天。
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
    // 可选。如果未指定，则不会检查下雨状态。
    "raining": true,
    // 可选。如果不指定，则不检查雷电状态。
    // 指定 "raining": true 和 "thundering": true 在功能上等同于仅指定
    // "thundering"：true，因为雷雨天气时总是下雨。
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
        // 如果我们的目标在下界的任何地方就成功。
        "dimension": "the_nether"
    },
    // 可选的位置偏移值。仅在以某种方式检查位置时有关。
    // 必须一次性全部提供，或者根本不提供。
    "offsetX": 10,
    "offsetY": 10,
    "offsetZ": 10
}
```

数据生成期间，以 `LocationPredicate` 以及可选的 `BlockPos` 调用 `LocationCheck#checkLocation`，为此条件构造 builder。

## `minecraft:block_state_property`

此条件检查被破坏的方块状态中，指定方块状态属性是否具有指定值。它需要 `minecraft:block_state` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:block_state_property",
    // 预期的方块。如果与实际被破坏的方块不匹配，条件就会失败。
    "block": "minecraft:oak_slab",
    // 要匹配的方块状态属性。未指定的属性可以具有任一值。
    // 本例只希望在上半台阶被破坏时成功，无论其是否含水。
    // 如果此指定方块上不存在的属性，则会打印日志警告。
    "properties": {
        "type": "top"
    }
}
```

数据生成期间，以方块调用 `LootItemBlockStatePropertyCondition#hasBlockStateProperties`，为此条件构造 builder。随后可使用 `#setProperties` 在 builder 上设置所需的方块状态属性值。

## `minecraft:survives_explosion`

此条件会随机摧毁掉落物。掉落物存留的概率为 1 / `explosion_radius` 战利品参数。除信标或龙蛋等极少数例外外，所有方块掉落物都使用此函数。它需要 `minecraft:explosion_radius` 战利品参数；如果该参数缺失，则始终成功。

```json5
{
    "condition": "minecraft:survives_explosion"
}
```

数据生成期间，调用 `ExplosionCondition#survivesExplosion` 为此条件构造 builder。

## `minecraft:match_tool`

此条件接受一个 `ItemPredicate`，并将其与 `tool` 战利品参数进行检查。`ItemPredicate` 可以指定有效物品 id 列表（`items`）、物品数量的最小/最大范围（`count`）、`DataComponentPredicate`（`components`）以及 `ItemSubPredicate` Map（`predicates`）；所有字段均为可选。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:match_tool",
    // 匹配下界合金镐或斧头。
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
    // 附魔是否应为 active (true) 或 not (false)。
    "active": true
}
```

数据生成期间，调用 `EnchantmentActiveCheck#enchantmentActiveCheck` 或 `#enchantmentInactiveCheck`，为此条件构造 builder。

## `minecraft:table_bonus`

此条件与 `minecraft:random_chance_with_enchanted_bonus` 类似，但使用固定值而非随机值。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:table_bonus",
    // 如果存在幸运附魔，则应用奖金。
    "enchantment": "minecraft:fortune",
    // 每个级别的使用机会。如果未附魔，此示例有 20% 的成功机会，
    // 如果在 1 级附魔，则为 30%；如果在 2 级或以上附魔，则为 60%。
    "chances": [0.2, 0.3, 0.6]
}
```

数据生成期间，以附魔 id 和概率调用 `BonusLevelTableCondition#bonusLevelFlatChance`，为此条件构造 builder。

## `minecraft:entity_properties`

此条件针对[目标实体][entitytarget]检查给定 `EntityPredicate`。`EntityPredicate` 可以检查实体类型、生物效果、NBT 值、装备、位置等。

```json5
{
    "condition": "minecraft:entity_properties",
    // 要使用的实体目标。有效值为 "this"、"attacker"、"direct_attacker" 或 "attacking_player"。
    // 这些对应于 "this_entity"、"attacking_entity"、"direct_attacking_entity" 和分别为
    // "last_damage_player" 战利品参数。
    "entity": "attacker",
    // 仅当目标是猪时才成功。谓词也可以为空，可以使用此
    // 检查指定的实体目标是否已设置。
    "predicate": {
        "type": "minecraft:pig"
    }
}
```

数据生成期间，以目标实体调用 `LootItemEntityPropertyCondition#entityPresent`，或以目标实体和 `EntityPredicate` 调用 `LootItemEntityPropertyCondition#hasProperties`，为此条件构造 builder。

## `minecraft:damage_source_properties`

此条件针对伤害来源战利品参数检查给定 `DamageSourcePredicate`。它需要 `minecraft:origin` 与 `minecraft:damage_source` 战利品参数；如果这些参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:damage_source_properties",
    "predicate": {
        // 检查源实体是否为僵尸实体。
        "source_entity": {
            "type": "zombie"
        }
    }
}
```

数据生成期间，以 `DamageSourcePredicate.Builder` 调用 `DamageSourceCondition#hasDamageSource`，为此条件构造 builder。

## `minecraft:killed_by_player`

此条件判断击杀是否由玩家完成。部分实体掉落物会使用它，例如烈焰人掉落的烈焰棒。它需要 `minecraft:last_player_damage` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:killed_by_player"
}
```

数据生成期间，调用 `LootItemKilledByPlayerCondition#killedByPlayer` 为此条件构造 builder。

## `minecraft:entity_scores`

此条件检查[目标实体][entitytarget]的记分板。它需要与指定目标实体对应的战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "minecraft:entity_scores"
    // 要使用的实体目标。有效值为 "this"、"attacker"、"direct_attacker" 或 "attacking_player"。
    // 这些对应于 "this_entity"、"attacking_entity"、"direct_attacking_entity" 和分别为
    // "last_damage_player" 战利品参数。
    "entity": "attacker",
    // 必须在给定范围内的记分板值列表。
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

数据生成期间，以目标实体调用 `EntityHasScoreCondition#hasScores`，为此条件构造 builder。随后使用 `#withScore` 向 builder 添加所需分数。

## `minecraft:reference`

此条件引用谓词文件并返回其结果。更多信息请参阅[物品谓词][predicate]。

```json5
{
    "condition": "minecraft:reference",
    // 指 data/examplemod/predicate/example_predicate.json 处的谓词文件。
    "name": "examplemod:example_predicate"
}
```

数据生成期间，以所引用谓词文件的 id 调用 `ConditionReference#conditionReference`，为此条件构造 builder。

## `minecraft:environment_attribute_check`

此条件检查上下文维度中的环境属性是否与给定值匹配。如果环境属性与位置有关（可随玩家在 Level 中的位置变化），则需要 `minecraft:origin` 战利品参数；如果该参数缺失，则始终失败。如果维度中不存在该属性，则针对默认值进行检查。

```json5
{
    "condition": "minecraft:environment_attribute_check",
    // 要检查其值的环境属性。
    "attribute": "minecraft:gameplay/water_evaporates",
    // 环境属性必须为的值。
    "value": false
}
```

数据生成期间，以已注册的 `EnvironmentAttribute` 及其值调用 `EnvironmentAttributeCheck#environmentAttribute`，为此条件构造 builder。

## `neoforge:loot_table_id`

仅当外围战利品表 id 匹配时，此条件才返回 true。它通常用于[全局战利品修改器][glm]。

```json5
{
    "condition": "neoforge:loot_table_id",
    // 仅当战利品表为污垢时适用
    "loot_table_id": "minecraft:blocks/dirt"
}
```

数据生成期间，以所需战利品表 id 调用 `LootTableIdCondition#builder`，为此条件构造 builder。

## `neoforge:can_item_perform_ability`

仅当 `tool` 战利品上下文参数（`LootContextParams.TOOL`）中的物品（通常是用于破坏方块或击杀实体的物品）能够执行指定 [`ItemAbility`][itemability] 时，此条件才返回 true。它需要 `minecraft:tool` 战利品参数；如果该参数缺失，则始终失败。

```json5
{
    "condition": "neoforge:can_item_perform_ability",
    // 仅当该工具可以像斧头一样剥离原木时才适用
    "ability": "axe_strip"
}
```

数据生成期间，以所需物品能力的 id 调用 `CanItemPerformAbility#canItemPerformAbility`，为此条件构造 builder。

## 另请参阅

- [Minecraft Wiki][mcwiki] 上的[物品谓词][predicatejson]

[custom]: custom.md#自定义战利品条件
[entitytarget]: index.md#entity-targets
[entry]: index.md#战利品条目
[glm]: glm.md
[itemability]: ../../../items/tools.md#itemabilitys
[mcwiki]: https://minecraft.wiki
[numberprovider]: index.md#number-provider
[pool]: index.md#loot-pool
[predicate]: https://minecraft.wiki/w/Predicate
[predicatejson]: https://minecraft.wiki/w/Predicate#JSON_format
[registry]: ../../../concepts/registries.md
