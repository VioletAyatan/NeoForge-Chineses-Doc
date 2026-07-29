# 内置数据映射（Built-in Data Maps）

NeoForge 为常见用例提供了多种内置 [数据映射][datamap]，用于取代原版中硬编码的字段。原版值通过 NeoForge 的数据映射文件提供，因此对玩家而言没有功能差异。

## `neoforge:acceptable_villager_distances`

允许配置村民能够注意到某个 Entity 的最大方块距离，用于取代 `VillagerHostilesSensor.ACCEPTABLE_DISTANCE_FROM_HOSTILES`（该字段将在 26.2 中被忽略）。此数据映射位于 `neoforge/data_maps/entity_type/acceptable_villager_distances.json`，其对象具有以下结构：

```json5
{
    // 村民将此实体检测为敌对的最大方块距离
    "acceptable_villager_distance": 4.0
}
```

示例：

```json5
{
    "values": {
        // 如果火焰位于距其位置 4 格以内，村民将检测为敌对火焰
        "minecraft:blaze": {
            "acceptable_villager_distance": 4.0
        }
    }
}
```

## `neoforge:compostables`

允许配置堆肥桶数值，用于取代 `ComposterBlock.COMPOSTABLES`（该字段现在已被忽略）。此数据映射位于 `neoforge/data_maps/item/compostables.json`，其对象具有以下结构：

```json5
{
    // 0 到 1（含）的浮点数，表示该物品更新堆肥器等级的概率
    "chance": 1,
    // 可选，默认为false - 农民村民是否可以堆肥此物品
    "can_villager_compost": false
}
```

示例：

```json5
{
    "values": {
        // 给予金合欢原木 50% 的机会填满堆肥器
        "minecraft:acacia_log": {
            "chance": 0.5
        }
    }
}
```

## `neoforge:furnace_fuels`

允许配置物品的燃烧时间。此数据映射位于 `neoforge/data_maps/item/furnace_fuels.json`，其对象具有以下结构：

```json5
{
    // 一个正整数，表示该物品的燃烧时间（以刻度为单位）
    "burn_time": 1000
}
```

示例：

```json5
{
    "values": {
        // 给予砧座 2 秒的燃烧时间
        "minecraft:anvil": {
            "burn_time": 40
        }
    }
}
```

:::info
NeoForge 还添加了可由自定义物品重写的 `IItemExtension#getBurnTime` 方法，该方法的结果会覆盖此数据映射。只有在数据映射无法满足需求的场景中才应使用 `#getBurnTime`，例如燃烧时间取决于[数据组件][datacomponent]时。
:::

:::warning
原版会为 `#minecraft:logs` 和 `#minecraft:planks` 隐式添加 300 tick（15 秒）的燃烧时间，随后又通过硬编码将绯红与诡异木制物品排除在外。这意味着，如果你添加了另一种不可燃木材，应像下面这样在此映射中为该木材类型的物品添加移除项：

```json5
{
    "replace": false,
    "values": [
        // 值在这里
    ],
    "remove": [
        "examplemod:example_nether_wood_planks",
        "#examplemod:example_nether_wood_stems",
        "examplemod:example_nether_wood_door",
        // 等
        // 其他删除此处
    ]
}
```
:::

## `neoforge:monster_room_mobs`

允许配置地牢刷怪笼中可能出现的生物，用于取代 `MonsterRoomFeature#MOBS`（该字段现在已被忽略）。此数据映射位于 `neoforge/data_maps/entity_type/monster_room_mobs.json`，其对象具有以下结构：

```json5
{
    // 此生物相对于数据映射中其他生物的权重
    "weight": 100
}
```

示例：

```json5
{
    "values": {
        // 使鱿鱼出现在怪物室刷怪笼中，重量为100
        "minecraft:squid": {
            "weight": 100
        }
    }
}
```

## `neoforge:oxidizables`

允许配置氧化阶段，用于取代 `WeatheringCopper#NEXT_BY_BLOCK`。此数据映射还用于构建反向的除锈映射（供斧刮除时使用）。它位于 `neoforge/data_maps/block/oxidizables.json`，其对象具有以下结构：

```json5
{
    // 该方块此方块一旦被氧化就会变成
    "next_oxidation_stage": "examplemod:oxidized_block"
}
```

:::info
自定义方块必须实现 `WeatheringCopperFullBlock` 或 `WeatheringCopper`，并在 `randomTick` 中调用 `changeOverTime`，才能自然氧化。
:::

示例：

```json5
{
    "values": {
        "mymod:custom_copper": {
            // 将定制铜方块氧化成定制氧化铜
            "next_oxidation_stage": "mymod:custom_oxidized_copper"
        }
    }
}
```

## `neoforge:parrot_imitations`

允许配置鹦鹉模仿生物时播放的声音，用于取代 `Parrot#MOB_SOUND_MAP`（该字段现在已被忽略）。此数据映射位于 `neoforge/data_maps/entity_type/parrot_imitations.json`，其对象具有以下结构：

```json5
{
    // 鹦鹉模仿生物时发出的声音 ID
    "sound": "minecraft:entity.parrot.imitate.creeper"
}
```

示例：

```json5
{
    "values": {
        // 让鹦鹉在模仿鸣叫时发出环境洞穴声音
        "minecraft:allay": {
            "sound": "minecraft:ambient.cave"
        }
    }
}
```

## `neoforge:raid_hero_gifts`

允许配置当你阻止袭击后，具有特定 `VillagerProfession` 的村民可能赠送给你的礼物，用于取代 `GiveGiftToHero#GIFTS`（该字段现在已被忽略）。此数据映射位于 `neoforge/data_maps/villager_profession/raid_hero_gifts.json`，其对象具有以下结构：

```json5
{
    // 村民职业在袭击后发放的战利品表的ID
    "loot_table": "minecraft:gameplay/hero_of_the_village/armorer_gift"
}
```

示例：

```json5
{
    "values": {
        "minecraft:armorer": {
            // 让护甲师给突袭英雄护甲师礼物战利品表
            "loot_table": "minecraft:gameplay/hero_of_the_village/armorer_gift"
        }
    }
}
```

## `neoforge:strippables`

允许配置方块被去皮时（用斧或具有物品能力 `ItemAbilities#AXE_STRIP` 的物品右键点击）将变成的方块，用于取代 `AxeItem#STRIPPABLES`（该字段将在 26.2 中被忽略）。此数据映射位于 `neoforge/data_maps/block/strippables.json`，其对象具有以下结构：

```json5
{
    // 当使用具有物品能力 `ItemAbilities#AXE_STRIP` 的工具剥离时，将变成此方块
    "stripped_block": "examplemod:stripped_wood"
}
```

示例：

```json5
{
    "values": {
        "examplemod:wood": {
            // 将定制木方块条制作成定制条状木方块
            "stripped_block": "examplemod:stripped_wood"
        }
    }
}
```

## `neoforge:vibration_frequencies`

允许配置游戏事件发出的幽匿振动频率，用于取代 `VibrationSystem#VIBRATION_FREQUENCY_FOR_EVENT`（该字段现在已被忽略）。此数据映射位于 `neoforge/data_maps/game_event/vibration_frequencies.json`，其对象具有以下结构：

```json5
{
    // 1～15（含）之间的整数，表示事件的振动频率
    "frequency": 2
}
```

示例：

```json5
{
    "values": {
        // 使水游戏活动中的水花以第二频率振动
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
    // 将在此生物群落中生成的村民类型
    // 如果没有为生物群落指定村民类型，则将使用 `minecraft:plains`
    "villager_type": "minecraft:desert"
    
}
```

示例：

```json5
{
    "values": {
        // 使丛林生物群落中的村民成为沙漠类型
        "minecraft:jungle": {
            "villager_type": "minecraft:desert"
        }
    }
}
```

## `neoforge:waxables`

允许配置方块上蜡时（用蜜脾右键点击）将变成的方块，用于取代 `HoneycombItem#WAXABLES`。此数据映射还用于构建反向的除蜡映射（供斧刮除时使用）。它位于 `neoforge/data_maps/block/waxables.json`，其对象具有以下结构：

```json5
{
    // 此方块的打蜡变体
    "waxed": "minecraft:iron_block"
}
```

示例：

```json5
{
    "values": {
        // 让金方块打蜡后变成铁方块
        "minecraft:gold_block": {
            "waxed": "minecraft:iron_block"
        }
    }
}
```

[datacomponent]: ../../../items/datacomponents.md
[datamap]: index.md
