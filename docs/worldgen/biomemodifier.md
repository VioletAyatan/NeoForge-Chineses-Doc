# 生物群系修饰符（Biome Modifier）

生物群系修饰符是一套由数据驱动的系统，可用于更改生物群系的多个方面，包括注入或移除 PlacedFeature、添加或移除生物生成、改变气候，以及调整植被与水体颜色。NeoForge 提供了若干默认生物群系修饰符，覆盖玩家与 mod 开发者的大多数用例。

### 推荐阅读章节

- 玩家或数据包开发者：
  - [应用生物群系修饰符](#应用生物群系修饰符)
  - [内置 NeoForge 生物群系修饰符](#内置生物群系修饰符)

- 进行简单添加或移除型生物群系修改的 mod 开发者：
  - [应用生物群系修饰符](#应用生物群系修饰符)
  - [内置 NeoForge 生物群系修饰符](#内置生物群系修饰符)
  - [生成生物群系修饰符数据](#生成生物群系修饰符数据)
  - [定位可能不存在的生物群系](#定位可能不存在的生物群系)

- 希望进行自定义或复杂生物群系修改的 mod 开发者：
  - [应用生物群系修饰符](#应用生物群系修饰符)
  - [创建自定义生物群系修饰符](#创建自定义生物群系修饰符)
  - [生成生物群系修饰符数据](#生成生物群系修饰符数据)
  - [定位可能不存在的生物群系](#定位可能不存在的生物群系)

## 应用生物群系修饰符

要让 NeoForge 将生物群系修饰符 JSON 文件加载到游戏中，该文件必须位于 mod 资源中的 `data/<modid>/neoforge/biome_modifier/<path>.json`，或位于[数据包][datapacks]中。NeoForge 加载生物群系修饰符后，会读取其指令，并在世界加载时对所有目标生物群系应用所述修改。数据包可以在完全相同的位置放置同名的新 JSON 文件，以覆盖 mod 中已有的生物群系修饰符。

可以按照“[内置 NeoForge 生物群系修饰符](#内置生物群系修饰符)”一节中的示例手动创建 JSON 文件，也可以按照“[生成生物群系修饰符数据](#生成生物群系修饰符数据)”一节进行数据生成。

## 内置生物群系修饰符

这些生物群系修饰符由 NeoForge 注册，任何人都可使用。

### 无操作

此生物群系修饰符不执行任何操作，也不会进行任何修改。数据包制作者与玩家可以在数据包中使用它，以如下 JSON 覆盖 mod 的生物群系修饰符 JSON，从而将其禁用。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:none"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> NO_OP_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "no_op_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Register the biome modifiers.
    bootstrap.register(NO_OP_EXAMPLE, NoneBiomeModifier.INSTANCE);
});
```

</TabItem>
</Tabs>

### 添加 Feature

此生物群系修饰符类型向生物群系添加 `PlacedFeature`（如树木或矿石），使其能够在世界生成期间出现。该修饰符接收要添加 Feature 的生物群系 id 或标签、要添加到所选生物群系的 `PlacedFeature` id 或标签，以及 Feature 所属的 [`GenerationStep.Decoration`](#decoration-step-的可用值)。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_features",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "#namespace:your_biome_tag",
    // Can either be a placed feature id, such as "examplemod:add_features_example",
    // or a list of placed feature ids, such as ["examplemod:add_features_example", minecraft:ice_spike", ...],
    // or a placed feature tag, such as "#examplemod:placed_feature_tag".
    "features": "namespace:your_feature",
    // See the GenerationStep.Decoration enum in code for a list of valid enum names.
    // The decoration step section further down also has the list of values for reference.
    "step": "underground_ores"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Assume we have some PlacedFeature named EXAMPLE_PLACED_FEATURE.
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> ADD_FEATURES_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "add_features_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<PlacedFeature> placedFeatures = bootstrap.lookup(Registries.PLACED_FEATURE);

    // Register the biome modifiers.
    bootstrap.register(ADD_FEATURES_EXAMPLE,
        new AddFeaturesBiomeModifier(
            // The biome(s) to generate within
            HolderSet.direct(biomes.getOrThrow(Biomes.PLAINS)),
            // The feature(s) to generate within the biomes
            HolderSet.direct(placedFeatures.getOrThrow(EXAMPLE_PLACED_FEATURE)),
            // The generation step
            GenerationStep.Decoration.LOCAL_MODIFICATIONS
        )
    );
})
```

</TabItem>
</Tabs>

:::warning
向生物群系添加原版 `PlacedFeature` 时务必谨慎，因为这可能引发所谓的 Feature 循环冲突（两个生物群系的 Feature 列表包含相同的两个 Feature，但二者在同一 `GenerationStep` 中的顺序不同），进而导致崩溃。出于类似原因，不应在多个生物群系修饰符中使用同一个 `PlacedFeature`。

原版 `PlacedFeature` 可以在生物群系 JSON 中引用，也可以通过生物群系修饰符添加，但不应同时采用两种方式。如果仍需以此方式添加，最简单的规避办法是在自己的命名空间下复制一份原版 `PlacedFeature`。
:::

### 移除 Feature

此生物群系修饰符类型从生物群系中移除 Feature（如树木或矿石），使其不再于世界生成期间出现。该修饰符接收要移除 Feature 的生物群系 id 或标签、要从所选生物群系移除的 `PlacedFeature` id 或标签，以及要从中移除 Feature 的 [`GenerationStep.Decoration`](#decoration-step-的可用值)。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_features",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "#namespace:your_biome_tag",
    // Can either be a placed feature id, such as "examplemod:add_features_example",
    // or a list of placed feature ids, such as ["examplemod:add_features_example", "minecraft:ice_spike", ...],
    // or a placed feature tag, such as "#examplemod:placed_feature_tag".
    "features": "namespace:problematic_feature",
    // Optional field specifying a GenerationStep, or a list of GenerationSteps, to remove features from.
    // If omitted, defaults to all GenerationSteps.
    // See the GenerationStep.Decoration enum in code for a list of valid enum names.
    // The decoration step section further down also has the list of values for reference.
    "steps": ["underground_ores", "underground_decoration"]
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> REMOVE_FEATURES_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_features_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<PlacedFeature> placedFeatures = bootstrap.lookup(Registries.PLACED_FEATURE);

    // Register the biome modifiers.
    bootstrap.register(REMOVE_FEATURES_EXAMPLE,
        new RemoveFeaturesBiomeModifier(
            // The biome(s) to remove from
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // The feature(s) to remove from the biomes
            HolderSet.direct(placedFeatures.getOrThrow(OrePlacements.ORE_DIAMOND)),
            // The generation steps to remove from
            Set.of(
                GenerationStep.Decoration.LOCAL_MODIFICATIONS,
                GenerationStep.Decoration.UNDERGROUND_ORES
            )
        )
    );
});
```

</TabItem>
</Tabs>

### 添加生成

_另请参阅 [LivingEntity/自然生成][spawning]。_

此生物群系修饰符类型向生物群系添加 Entity 生成。该修饰符接收要添加 Entity 生成的生物群系 id 或标签，以及要添加的 Entity 的 `SpawnerData`。每个 `SpawnerData` 包含 Entity id、生成权重，以及单次生成的 Entity 最小/最大数量。

:::note
如果要添加新 Entity，请确保通过 `RegisterSpawnPlacementsEvent` 为其注册生成限制。生成限制用于让 Entity 安全地生成在表面或水中。如果不注册生成限制，Entity 可能生成在半空，随后坠落死亡。
:::

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_spawns",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "#namespace:biome_tag",
    // Can be either a single object or a list of objects.
    "spawners": [
        {
            "type": "namespace:entity_type", // The id of the entity type to spawn
            "weight": 100, // non-negative int, spawn weight
            "minCount": 1, // positive int, minimum group size
            "maxCount": 4 // positive int, maximum group size
        },
        {
            "type": "minecraft:ghast",
            "weight": 1,
            "minCount": 5,
            "maxCount": 10
        }
    ]
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Assume we have some EntityType<?> named EXAMPLE_ENTITY.
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> ADD_SPAWNS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "add_spawns_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);

    // Register the biome modifiers.
    bootstrap.register(ADD_SPAWNS_EXAMPLE,
        new AddSpawnsBiomeModifier(
            // The biome(s) to spawn the mobs within
            HolderSet.direct(biomes.getOrThrow(Biomes.PLAINS)),
            // The spawners of the entities to add
            List.of(
                new SpawnerData(EXAMPLE_ENTITY, 100, 1, 4),
                new SpawnerData(EntityType.GHAST, 1, 5, 10)
            )
        )
    );
});
```

</TabItem>
</Tabs>

### 移除生成

此生物群系修饰符类型从生物群系中移除 Entity 生成。该修饰符接收要移除 Entity 生成的生物群系 id 或标签，以及要移除的 Entity 的 `EntityType` id 或标签。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_spawns",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "#namespace:biome_tag",
    // Can either be an entity type id, such as "minecraft:ghast",
    // or a list of entity type ids, such as ["minecraft:ghast", "minecraft:skeleton", ...],
    // or an entity type tag, such as "#minecraft:skeletons".
    "entity_types": "#namespace:entitytype_tag"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> REMOVE_SPAWNS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_spawns_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<EntityType<?>> entities = bootstrap.lookup(Registries.ENTITY_TYPE);

    // Register the biome modifiers.
    bootstrap.register(REMOVE_SPAWNS_EXAMPLE,
        new RemoveSpawnsBiomeModifier(
            // The biome(s) to remove the spawns from
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // The entities to remove spawns for
            entities.getOrThrow(EntityTypeTags.SKELETONS)
        )
    );
});
```

</TabItem>
</Tabs>

### 添加生成代价

允许向生物群系添加新的生成代价。生成代价是一种较新的机制，可让生物分散生成以减少聚集。Entity 会向周围发出 `charge`，并与其他 Entity 的 `charge` 累加。生成新 Entity 时，生成算法会寻找一个位置，使该位置的总 `charge` 场乘以待生成 Entity 的 `charge` 值后，小于该 Entity 的 `energy_budget`。这是一种高级生物生成方式，因此建议参考灵魂沙峡谷生物群系（该系统最典型的使用者）并借鉴现有值。

该修饰符接收要添加生成代价的生物群系 id 或标签、要为其添加生成代价的 Entity Type 的 `EntityType` id 或标签，以及 Entity 的 `MobSpawnSettings.MobSpawnCost`。`MobSpawnCost` 包含能量预算，用于根据每个已生成 Entity 提供的电荷，指示某个位置可生成的最大 Entity 数量。

:::note
如果要添加新 Entity，请确保通过 `RegisterSpawnPlacementsEvent` 为其注册生成限制。
:::

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:add_spawn_costs",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "#namespace:biome_tag",
    // Can either be an entity type id, such as "minecraft:ghast",
    // or a list of entity type ids, such as ["minecraft:ghast", "minecraft:skeleton", ...],
    // or an entity type tag, such as "#minecraft:skeletons".
    "entity_types": "#minecraft:skeletons",
    "spawn_cost": {
        // The energy budget
        "energy_budget": 1.0,
        // The amount of charge each entity takes up from the budget
        "charge": 0.1
    }
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> ADD_SPAWN_COSTS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "add_spawn_costs_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<EntityType<?>> entities = bootstrap.lookup(Registries.ENTITY_TYPE);

    // Register the biome modifiers.
    bootstrap.register(ADD_SPAWN_COSTS_EXAMPLE,
        new AddSpawnCostsBiomeModifier(
            // The biome(s) to add the spawn costs to
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // The entities to add the spawn costs for
            entities.getOrThrow(EntityTypeTags.SKELETONS),
            new MobSpawnSettings.MobSpawnCost(
                1.0, // The energy budget
                0.1  // The amount of charge each entity takes up from the budget
            )
        )
    );
});
```

</TabItem>
</Tabs>

### 移除生成代价

允许从生物群系中移除生成代价。生成代价是一种较新的机制，可让生物分散生成以减少聚集。该修饰符接收要移除生成代价的生物群系 id 或标签，以及要移除生成代价的 Entity 的 `EntityType` id 或标签。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_spawn_costs",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "#namespace:biome_tag",
    // Can either be an entity type id, such as "minecraft:ghast",
    // or a list of entity type ids, such as ["minecraft:ghast", "minecraft:skeleton", ...],
    // or an entity type tag, such as "#minecraft:skeletons".
    "entity_types": "#minecraft:skeletons"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> REMOVE_SPAWN_COSTS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_spawn_costs_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<EntityType<?>> entities = bootstrap.lookup(Registries.ENTITY_TYPE);

    // Register the biome modifiers.
    bootstrap.register(REMOVE_SPAWN_COSTS_EXAMPLE,
        new RemoveSpawnCostsBiomeModifier(
            // The biome(s) to remove the spawn costs from
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // The entities to remove spawn costs for
            entities.getOrThrow(EntityTypeTags.SKELETONS)
        )
    );
});
```

</TabItem>
</Tabs>

### 添加旧版 Carver

此生物群系修饰符类型允许向生物群系添加由 Carver 生成的洞穴与峡谷。这是“洞穴与山崖”更新前使用的洞穴生成方式。它**不能**向生物群系添加噪声洞穴，因为噪声洞穴属于特定的基于噪声的区块生成器系统，实际上并不与生物群系绑定。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
    {
    "type": "neoforge:add_carvers",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "minecraft:plains",
    // Can either be a carver id, such as "examplemod:add_carvers_example",
    // or a list of carver ids, such as ["examplemod:add_carvers_example", "minecraft:canyon", ...],
    // or a carver tag, such as "#examplemod:configured_carver_tag".
    "carvers": "examplemod:add_carvers_example"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Assume we have some ConfiguredWorldCarver named EXAMPLE_CARVER.
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> ADD_CARVERS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "add_carvers_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<ConfiguredWorldCarver<?>> carvers = bootstrap.lookup(Registries.CONFIGURED_CARVER);

    // Register the biome modifiers.
    bootstrap.register(ADD_CARVERS_EXAMPLE,
        new AddCarversBiomeModifier(
            // The biome(s) to generate within
            HolderSet.direct(biomes.getOrThrow(Biomes.PLAINS)),
            // The carver(s) to generate within the biomes
            HolderSet.direct(carvers.getOrThrow(EXAMPLE_CARVER))
        )
    );
});
```

</TabItem>
</Tabs>

### 移除旧版 Carver

此生物群系修饰符类型允许从生物群系中移除由 Carver 生成的洞穴与峡谷。这是“洞穴与山崖”更新前使用的洞穴生成方式。它**不能**从生物群系中移除噪声洞穴，因为噪声洞穴已内置于维度的噪声设置系统中，实际上并不与生物群系绑定。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "type": "neoforge:remove_carvers",
    // Can either be a biome id, such as "minecraft:plains",
    // or a list of biome ids, such as ["minecraft:plains", "minecraft:badlands", ...],
    // or a biome tag, such as "#c:is_overworld".
    "biomes": "minecraft:plains",
    // Can either be a carver id, such as "examplemod:add_carvers_example",
    // or a list of carver ids, such as ["examplemod:add_carvers_example", "minecraft:canyon", ...],
    // or a carver tag, such as "#examplemod:configured_carver_tag".
    "carvers": "examplemod:add_carvers_example"
}
```

</TabItem>
<TabItem value="datagen" label="数据生成">

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> REMOVE_CARVERS_EXAMPLE = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "remove_carvers_example") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);
    HolderGetter<ConfiguredWorldCarver<?>> carvers = bootstrap.lookup(Registries.CONFIGURED_CARVER);

    // Register the biome modifiers.
    bootstrap.register(REMOVE_CARVERS_EXAMPLE,
        new AddFeaturesBiomeModifier(
            // The biome(s) to remove from
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            // The carver(s) to remove from the biomes
            HolderSet.direct(carvers.getOrThrow(Carvers.CAVE))
        )
    );
});
```

</TabItem>
</Tabs>

### Decoration Step 的可用值

上述许多 JSON 中的 `step` 或 `steps` 字段都指向 `GenerationStep.Decoration` 枚举。该枚举按以下顺序列出各阶段，这也是游戏在世界生成期间使用的顺序。请尽量把 Feature 放入最符合其用途的阶段。

|           阶段           | 说明                                                                                    |
|:------------------------:|:----------------------------------------------------------------------------------------|
|     `raw_generation`     | 最先运行。用于末地小型岛屿等类似特殊地形的 Feature。                                    |
|         `lakes`          | 专门用于生成熔岩湖等池塘类 Feature。                                                     |
|  `local_modifications`   | 用于晶洞、冰山、巨石或滴水石等地形修改。                                                |
| `underground_structures` | 用于地牢或化石等小型地下结构类 Feature。                                                |
|   `surface_structures`   | 用于沙漠水井等仅出现在地表的小型结构类 Feature。                                        |
|      `strongholds`       | 专门用于要塞结构。未经修改的 Minecraft 不会在此添加 Feature。                           |
|    `underground_ores`    | 添加所有矿石和矿脉的阶段，包括金矿石、泥土、花岗岩等。                                 |
| `underground_decoration` | 通常用于装饰洞穴。滴水石簇与幽匿脉络位于此阶段。                                       |
|     `fluid_springs`      | 小型熔岩瀑布与瀑布来自此阶段的 Feature。                                                |
|   `vegetal_decoration`   | 几乎所有植物（花、树、藤蔓等）都在此阶段添加。                                         |
| `top_layer_modification` | 最后运行。用于在寒冷生物群系表面放置雪和冰。                                           |

## 创建自定义生物群系修饰符

### `BiomeModifier` 实现

在底层，生物群系修饰符由三部分组成：

- [通过数据包注册][datareg]、用于修改生物群系 builder 的 `BiomeModifier`。
- [静态注册][staticreg]、用于编码和解码修饰符的 `MapCodec`。
- 用于构造 `BiomeModifier` 的 JSON，其中使用 `MapCodec` 的已注册 id 作为可索引类型。

`BiomeModifier` 包含两个方法：`#modify` 和 `#codec`。`modify` 接收当前 `Biome` 的 `Holder`、当前 `BiomeModifier.Phase` 以及待修改生物群系的 builder。每个 `BiomeModifier` 在每个 `Phase` 都会调用一次，以安排对生物群系的特定修改应在何时发生：

| Phase               | 说明                                                                     |
|:-------------------:|:-------------------------------------------------------------------------|
| `BEFORE_EVERYTHING` | 兜底阶段，用于所有需要在标准阶段之前运行的内容。                         |
| `ADD`               | 添加 Feature、生物生成等。                                               |
| `REMOVE`            | 移除 Feature、生物生成等。                                               |
| `MODIFY`            | 修改单个值（例如气候、颜色）。                                           |
| `AFTER_EVERYTHING`  | 兜底阶段，用于所有需要在标准阶段之后运行的内容。                         |

所有 `BiomeModifier` 都包含 `type` 键，它引用该 `BiomeModifier` 所用 `MapCodec` 的 id。`codec` 接收用于编码和解码修饰符的 `MapCodec`。此 `MapCodec` 会被[静态注册][staticreg]，其 id 用作 `BiomeModifier` 的 `type`。

```java
public record ExampleBiomeModifier(HolderSet<Biome> biomes, int value) implements BiomeModifier {
    
    @Override
    public void modify(Holder<Biome> biome, Phase phase, ModifiableBiomeInfo.BiomeInfo.Builder builder) {
        if (phase == /* Pick the phase that best matches what your want to modify */) {
            // Modify the 'builder', checking any information about the biome itself
        }
    }

    @Override
    public MapCodec<? extends BiomeModifier> codec() {
        return EXAMPLE_BIOME_MODIFIER.get();
    }
}

// In some registration class
private static final DeferredRegister<MapCodec<? extends BiomeModifier>> BIOME_MODIFIERS =
    DeferredRegister.create(NeoForgeRegistries.Keys.BIOME_MODIFIER_SERIALIZERS, MOD_ID);

public static final Supplier<MapCodec<ExampleBiomeModifier>> EXAMPLE_BIOME_MODIFIER =
    BIOME_MODIFIERS.register("example_biome_modifier", () -> RecordCodecBuilder.mapCodec(instance ->
        instance.group(
            Biome.LIST_CODEC.fieldOf("biomes").forGetter(ExampleBiomeModifier::biomes),
            Codec.INT.fieldOf("value").forGetter(ExampleBiomeModifier::value)
        ).apply(instance, ExampleBiomeModifier::new)
    ));
```

## 生成生物群系修饰符数据

可以通过[数据生成][datagen]创建 `BiomeModifier` JSON：将 `RegistrySetBuilder` 传给 `DatapackBuiltinEntriesProvider`。生成的 JSON 位于 `data/<modid>/neoforge/biome_modifier/<path>.json`。

有关 `RegistrySetBuilder` 与 `DatapackBuiltinEntriesProvider` 工作方式的更多信息，请参阅[数据包 Registry 的数据生成][datapackdatagen]一文。

```java
// Define the ResourceKey for our BiomeModifier.
public static final ResourceKey<BiomeModifier> EXAMPLE_MODIFIER = ResourceKey.create(
    NeoForgeRegistries.Keys.BIOME_MODIFIERS, // The registry this key is for
    Identifier.fromNamespaceAndPath(MOD_ID, "example_modifier") // The registry name
);

// BUILDER is a RegistrySetBuilder passed to DatapackBuiltinEntriesProvider
// in a listener for the `GatherDataEvent`s.
BUILDER.add(NeoForgeRegistries.Keys.BIOME_MODIFIERS, bootstrap -> {
    // Lookup any necessary registries.
    // Static registries only need to be looked up if you need to grab the tag data.
    HolderGetter<Biome> biomes = bootstrap.lookup(Registries.BIOME);

    // Register the biome modifiers.
    bootstrap.register(EXAMPLE_MODIFIER,
        new ExampleBiomeModifier(
            biomes.getOrThrow(Tags.Biomes.IS_OVERWORLD),
            20
        )
    );
});
```

这会生成以下 JSON：

```json5
// In data/examplemod/neoforge/biome_modifier/example_modifier.json
{
    // The registry key of the MapCodec for the modifier
    "type": "examplemod:example_biome_modifier",
    // All additional settings are applied to the root object
    "biomes": "#c:is_overworld",
    "value": 20
}
```

## 定位可能不存在的生物群系

有时，生物群系修饰符需要定位并非始终存在于游戏中的生物群系。如果生物群系修饰符直接定位未注册的生物群系，世界加载时就会崩溃。解决方法是创建生物群系标签，并将目标生物群系作为可选标签条目添加，将该条目的 required 设置为 false。示例如下：

```json5
{
    "replace": false,
    "values": [
        {
            "id": "minecraft:pale_garden",
            "required": false
        }
    ]
}
```

生物群系修饰符使用该生物群系标签后，即使生物群系未注册也不会崩溃。苍白之园生物群系就是一个用例：在 1.21.3 中，只有启用 Winter Drop 数据包时才会创建它；否则，该生物群系根本不存在于生物群系 Registry 中。另一个用例是定位 mod 添加的生物群系，同时确保在添加这些生物群系的 mod 不存在时仍能正常运行。

要通过数据生成创建生物群系标签的可选条目，代码大致如下：

```java
// In a KeyTagProvider<Biome> subclass
// Assume we have some example TagKey<Biome> OPTIONAL_BIOMES_TAG
@Override
protected void addTags(HolderLookup.Provider registries) {
    this.tag(OPTIONAL_BIOMES_TAG)
        // Must be a ResourceKey<Biome>
        .addOptional(Biomes.PALE_GARDEN);
}
```

[datagen]: ../resources/index.md#data-generation
[datapackdatagen]: ../concepts/registries#data-generation-for-datapack-registries
[datapacks]: ../resources/index.md#data
[datareg]: ../concepts/registries.md#datapack-registries
[spawning]: ../entities/livingentity.md#natural-spawning
[staticreg]: ../concepts/registries.md#methods-for-registering
