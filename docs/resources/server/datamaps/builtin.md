# 内置 Data Map

NeoForge 为常见用例提供了多种内置 [Data Map][datamap]，用于取代原版中硬编码的字段。原版值通过 NeoForge 的 Data Map 文件提供，因此对玩家而言没有功能差异。

## `neoforge:acceptable_villager_distances`

允许配置村民能够注意到某个 Entity 的最大方块距离，用于取代 `VillagerHostilesSensor.ACCEPTABLE_DISTANCE_FROM_HOSTILES`（该字段将在 26.2 中被忽略）。此 Data Map 位于 `neoforge/data_maps/entity_type/acceptable_villager_distances.json`，其对象具有以下结构：

```json5
{
    // The maximum block distance that a villager will detect this entity as hostile
    "acceptable_villager_distance": 4.0
}
```

示例：

```json5
{
    "values": {
        // Villagers will detect a blaze as hostile if it is within 4 blocks of its position
        "minecraft:blaze": {
            "acceptable_villager_distance": 4.0
        }
    }
}
```

## `neoforge:compostables`

允许配置堆肥桶数值，用于取代 `ComposterBlock.COMPOSTABLES`（该字段现在已被忽略）。此 Data Map 位于 `neoforge/data_maps/item/compostables.json`，其对象具有以下结构：

```json5
{
    // A 0 to 1 (inclusive) float representing the chance that the item will update the level of the composter
    "chance": 1,
    // Optional, defaults to false - whether farmer villagers can compost this item
    "can_villager_compost": false
}
```

示例：

```json5
{
    "values": {
        // Give acacia logs a 50% chance that they will fill a composter
        "minecraft:acacia_log": {
            "chance": 0.5
        }
    }
}
```

## `neoforge:furnace_fuels`

允许配置 Item 的燃烧时间。此 Data Map 位于 `neoforge/data_maps/item/furnace_fuels.json`，其对象具有以下结构：

```json5
{
    // A positive integer representing the item's burn time in ticks
    "burn_time": 1000
}
```

示例：

```json5
{
    "values": {
        // Give anvils a 2 seconds burn time
        "minecraft:anvil": {
            "burn_time": 40
        }
    }
}
```

:::info
NeoForge 还添加了可由自定义 Item 重写的 `IItemExtension#getBurnTime` 方法，该方法的结果会覆盖此 Data Map。只有在 Data Map 无法满足需求的场景中才应使用 `#getBurnTime`，例如燃烧时间取决于[数据组件][datacomponent]时。
:::

:::warning
原版会为 `#minecraft:logs` 和 `#minecraft:planks` 隐式添加 300 tick（15 秒）的燃烧时间，随后又通过硬编码将绯红与诡异木制 Item 排除在外。这意味着，如果你添加了另一种不可燃木材，应像下面这样在此映射中为该木材类型的 Item 添加移除项：

```json5
{
    "replace": false,
    "values": [
        // values here
    ],
    "remove": [
        "examplemod:example_nether_wood_planks",
        "#examplemod:example_nether_wood_stems",
        "examplemod:example_nether_wood_door",
        // etc.
        // other removals here
    ]
}
```
:::

## `neoforge:monster_room_mobs`

允许配置地牢刷怪笼中可能出现的生物，用于取代 `MonsterRoomFeature#MOBS`（该字段现在已被忽略）。此 Data Map 位于 `neoforge/data_maps/entity_type/monster_room_mobs.json`，其对象具有以下结构：

```json5
{
    // The weight of this mob, relative to other mobs in the datamap
    "weight": 100
}
```

示例：

```json5
{
    "values": {
        // Make squids appear in monster room spawners with a weight of 100
        "minecraft:squid": {
            "weight": 100
        }
    }
}
```

## `neoforge:oxidizables`

允许配置氧化阶段，用于取代 `WeatheringCopper#NEXT_BY_BLOCK`。此 Data Map 还用于构建反向的除锈映射（供斧刮除时使用）。它位于 `neoforge/data_maps/block/oxidizables.json`，其对象具有以下结构：

```json5
{
    // The block this block will turn into once oxidized
    "next_oxidation_stage": "examplemod:oxidized_block"
}
```

:::note
自定义 Block 必须实现 `WeatheringCopperFullBlock` 或 `WeatheringCopper`，并在 `randomTick` 中调用 `changeOverTime`，才能自然氧化。
:::

示例：

```json5
{
    "values": {
        "mymod:custom_copper": {
            // Make a custom copper block oxidize into custom oxidized copper
            "next_oxidation_stage": "mymod:custom_oxidized_copper"
        }
    }
}
```

## `neoforge:parrot_imitations`

允许配置鹦鹉模仿生物时播放的声音，用于取代 `Parrot#MOB_SOUND_MAP`（该字段现在已被忽略）。此 Data Map 位于 `neoforge/data_maps/entity_type/parrot_imitations.json`，其对象具有以下结构：

```json5
{
    // The ID of the sound that parrots will produce when imitating the mob
    "sound": "minecraft:entity.parrot.imitate.creeper"
}
```

示例：

```json5
{
    "values": {
        // Make parrots produce the ambient cave sound when imitating allays
        "minecraft:allay": {
            "sound": "minecraft:ambient.cave"
        }
    }
}
```

## `neoforge:raid_hero_gifts`

允许配置当你阻止袭击后，具有特定 `VillagerProfession` 的村民可能赠送给你的礼物，用于取代 `GiveGiftToHero#GIFTS`（该字段现在已被忽略）。此 Data Map 位于 `neoforge/data_maps/villager_profession/raid_hero_gifts.json`，其对象具有以下结构：

```json5
{
    // The ID of the loot table that a villager profession will hand out after a raid
    "loot_table": "minecraft:gameplay/hero_of_the_village/armorer_gift"
}
```

示例：

```json5
{
    "values": {
        "minecraft:armorer": {
            // Make armorers give the raid hero the armorer gift loot table
            "loot_table": "minecraft:gameplay/hero_of_the_village/armorer_gift"
        }
    }
}
```

## `neoforge:strippables`

允许配置 Block 被去皮时（用斧或具有 Item 能力 `ItemAbilities#AXE_STRIP` 的 Item 右键点击）将变成的 Block，用于取代 `AxeItem#STRIPPABLES`（该字段将在 26.2 中被忽略）。此 Data Map 位于 `neoforge/data_maps/block/strippables.json`，其对象具有以下结构：

```json5
{
    // The block this block will turn into when stripped by tool with the item ability `ItemAbilities#AXE_STRIP`
    "stripped_block": "examplemod:stripped_wood"
}
```

示例：

```json5
{
    "values": {
        "examplemod:wood": {
            // Make a custom wood block strip into a custom stripped wood block
            "stripped_block": "examplemod:stripped_wood"
        }
    }
}
```

## `neoforge:vibration_frequencies`

允许配置游戏事件发出的幽匿振动频率，用于取代 `VibrationSystem#VIBRATION_FREQUENCY_FOR_EVENT`（该字段现在已被忽略）。此 Data Map 位于 `neoforge/data_maps/game_event/vibration_frequencies.json`，其对象具有以下结构：

```json5
{
    // An integer between 1 and 15 (inclusive) that indicates the vibration frequency of the event
    "frequency": 2
}
```

示例：

```json5
{
    "values": {
        // Make the splash in water game event vibrate on the second frequency
        "minecraft:splash": {
            "frequency": 2
        }
    }
}
```

## `neoforge:villager_types`

允许根据生物群系配置生成的村民类型，用于取代 `VillagerType#BY_BIOME`（该字段将在 26.2 中被忽略）。它位于 `neoforge/data_maps/worldgen/biome/villager_types.json`，其对象具有以下结构：

```json5
{
    // The villager type that will spawn in this biome
    // If no villager type is specified for a biome, then `minecraft:plains` will be used
    "villager_type": "minecraft:desert"
    
}
```

示例：

```json5
{
    "values": {
        // Make villagers in the jungle biome be of the desert type
        "minecraft:jungle": {
            "villager_type": "minecraft:desert"
        }
    }
}
```

## `neoforge:waxables`

允许配置 Block 上蜡时（用蜜脾右键点击）将变成的 Block，用于取代 `HoneycombItem#WAXABLES`。此 Data Map 还用于构建反向的除蜡映射（供斧刮除时使用）。它位于 `neoforge/data_maps/block/waxables.json`，其对象具有以下结构：

```json5
{
    // The waxed variant of this block
    "waxed": "minecraft:iron_block"
}
```

示例：

```json5
{
    "values": {
        // Make gold blocks turn into iron blocks once waxed
        "minecraft:gold_block": {
            "waxed": "minecraft:iron_block"
        }
    }
}
```

[datacomponent]: ../../../items/datacomponents.md
[datamap]: index.md
