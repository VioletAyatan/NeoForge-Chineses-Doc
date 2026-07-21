# 功能标志（Feature Flags）

Feature Flag 是一种系统，开发者可以让一组功能以某些必需 Flag 为启用条件；这些功能可以是注册元素、游戏机制、Data Pack 条目，或模组特有的其他系统。

常见用例是把实验性功能或元素置于一个实验性 Flag 之后，让用户能够在这些功能最终定稿前方便地开启并试用。

:::tip
你并非必须添加自己的 Flag。如果原版中有适合用例的 Flag，可以直接为你的 Block、Item、Entity 等设置该 Flag。

例如，在 `1.21.3` 中，如果你要扩充 Pale Oak 木质 Block 集合，就只应在 `WINTER_DROP` Flag 启用时显示它们。
:::

## 创建 Feature Flag

要创建新的 Feature Flag，需要创建一个 JSON 文件，并在 `neoforge.mods.toml` 文件的 `[[mods]]` 块中通过 `featureFlags` 条目引用它。指定路径必须相对于 `resources` 目录：

```toml
# In neoforge.mods.toml:
[[mods]]
    # The file is relative to the output directory of the resources, or the root path inside the jar when compiled
    # The 'resources' directory represents the root output directory of the resources
    featureFlags="META-INF/feature_flags.json"
```

条目定义由 Feature Flag 名称列表组成，这些名称会在游戏初始化期间加载并注册。

```json5
{
    "flags": [
        // Identifier of a Feature flag to be registered
        "examplemod:experimental"
    ]
}
```

## 获取 Feature Flag

可以通过 `FeatureFlagRegistry.getFlag(Identifier)` 获取已注册的 Feature Flag。模组初始化期间随时都可以这样做。建议将结果保存到某处供以后使用，不要在每次需要 Flag 时都查询 Registry。

```java
// Look up the 'examplemod:experimental' Feature flag
public static final FeatureFlag EXPERIMENTAL = FeatureFlags.REGISTRY.getFlag(Identifier.fromNamespaceAndPath("examplemod", "experimental"));
```

## Feature Element

`FeatureElement` 是可指定一组必需 Flag 的 Registry 值。只有当相应的必需 Flag 与 Level 中启用的 Flag 匹配时，玩家才能使用这些值。

Feature Element 禁用后，会从玩家视野中完全隐藏，并跳过所有交互。请注意，这些禁用的元素仍存在于 Registry 中，只是在功能上无法使用。

下面列出了所有直接实现 `FeatureElement` 系统的 Registry：

- Item
- Block
- EntityType
- MenuType
- Potion
- MobEffect
- GameRule

### 为元素设置 Flag

要把某个 `FeatureElement` 标记为需要你的 Feature Flag，只需把它与其他所需 Flag 一并传入相应的注册方法：

- `Item`: `Item.Properties#requiredFeatures`
- `Block`: `BlockBehaviour.Properties#requiredFeatures`
- `EntityType`: `EntityType.Builder#requiredFeatures`
- `MenuType`: `MenuType#new`
- `Potion`: `Potion#requiredFeatures`
- `MobEffect`: `MobEffect#requiredFeatures`
- `GameRule`: `GameRule#new`

```java
// These elements will only become available once the 'EXPERIMENTAL' flag is enabled

// Item
DeferredRegister.Items ITEMS = DeferredRegister.createItems("examplemod");
DeferredItem<Item> EXPERIMENTAL_ITEM = ITEMS.registerSimpleItem("experimental", props -> props
    .requiredFeatures(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
);

// Block
DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("examplemod");
// Do note that BlockBehaviour.Properties#ofFullCopy and BlockBehaviour.Properties#ofLegacyCopy will copy over the required features.
// This means that in 1.21.3, using BlockBehaviour.Properties.ofFullCopy(Blocks.PALE_OAK_WOOD) would have your block require the 'WINTER_DROP' flag.
DeferredBlock<Block> EXPERIMENTAL_BLOCK = BLOCKS.registerSimpleBlock("experimental", BlockBehaviour.Properties.of()
    .requiredFeatures(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
);

// BlockItems are special in that the required features are inherited from their respective Blocks.
// The same is also true for spawn eggs and their respective EntityTypes.
DeferredItem<BlockItem> EXPERIMENTAL_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(EXPERIMENTAL_BLOCK);

// EntityType
DeferredRegister<EntityType<?>> ENTITY_TYPES = DeferredRegister.create(Registries.ENTITY_TYPE, "examplemod");
DeferredHolder<EntityType<?>, EntityType<ExperimentalEntity>> EXPERIMENTAL_ENTITY = ENTITY_TYPES.register("experimental", registryName -> EntityType.Builder.of(ExperimentalEntity::new, MobCategory.AMBIENT)
    .requiredFeatures(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
    .build(ResourceKey.create(Registries.ENTITY_TYPE, registryName))
);

// MenuType
DeferredRegister<MenuType<?>> MENU_TYPES = DeferredRegister.create(Registries.MENU, "examplemod");
DeferredHolder<MenuType<?>, MenuType<ExperimentalMenu>> EXPERIMENTAL_MENU = MENU_TYPES.register("experimental", () -> new MenuType<>(
    // Using vanilla's MenuSupplier:
    // This is used when your menu is not encoding complex data during `player.openMenu`. Example:
    // (windowId, inventory) -> new ExperimentalMenu(windowId, inventory),

    // Using NeoForge's IContainerFactory:
    // This is used when you wish to read complex data encoded during `player.openMenu`.
    // Casting is important here, as `MenuType` specifically expects a `MenuSupplier`.
    (IContainerFactory<ExperimentalMenu>) (windowId, inventory, buffer) -> new ExperimentalMenu(windowId, inventory, buffer),
    
    FeatureFlagSet.of(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
));

// MobEffect
DeferredRegister<MobEffect> MOB_EFFECTS = DeferredRegister.create(Registries.MOB_EFFECT, "examplemod");
DeferredHolder<MobEffect, ExperimentalMobEffect> EXPERIMENTAL_MOB_EEFECT = MOB_EFFECTS.register("experimental", registryName -> new ExperimentalMobEffect(MobEffectCategory.NEUTRAL, CommonColors.WHITE)
    .requiredFeatures(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
);

// Potion
DeferredRegister<Potion> POTIONS = DeferredRegister.create(Registries.POTION, "examplemod");
DeferredHolder<Potion, ExperimentalPotion> EXPERIMENTAL_POTION = POTIONS.register("experimental", registryName -> new ExperimentalPotion(registryName.toString(), new MobEffectInstance(EXPERIMENTAL_MOB_EEFECT))
    .requiredFeatures(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
);

// GameRule
DeferredRegister<GameRule> GAME_RULES = DefeferredRegister.create(Registries.GAME_RULE, "examplemod");
DeferredHolder<GameRule, GameRule> EXPERIMENTAL_GAME_RULE = GAME_RULES.register("experimental", registryName -> new GameRule(
    GameRuleCategory.MISC, GameRuleType.BOOL, BoolArgumentType.bool(), GameRuleTypeVisitor::visitBoolean, Codec.BOOL, bool -> bool ? 1 : 0, false,
    FeatureFlagSet.of(EXPERIMENTAL) // mark as requiring the 'EXPERIMENTAL' flag
));
```

### 验证启用状态

要验证功能是否应启用，必须先取得已启用功能的集合。这可以通过多种方式完成，常用且推荐的方法是 `LevelReader#enabledFeatures`。  

```java
level.enabledFeatures(); // from a 'LevelReader' instance
entity.level().enabledFeatures(); // from a 'Entity' instance

// Client Side
minecraft.getConnection().enabledFeatures();

// Server Side
server.getWorldData().enabledFeatures();
```

要验证任意 `FeatureFlagSet` 是否启用，可以把已启用功能传给 `FeatureFlagSet#isSubsetOf`；要验证特定 `FeatureElement` 是否启用，可以调用 `FeatureElement#isEnabled`。

:::info
`ItemStack` 有一个特殊的 `isItemEnabled(FeatureFlagSet)` 方法。这样，即使作为基础的 `Item` 所需功能与已启用功能不匹配，空 Stack 仍会被视为已启用。建议尽可能优先使用此方法，而不是 `Item#isEnabled`。
:::

```java
requiredFeatures.isSubsetOf(enabledFeatures);
featureElement.isEnabled(enabledFeatures);
itemStack.isItemEnabled(enabledFeatures);
```

## Feature Pack

_另请参阅：[Resource Pack](../resources/index.md#assets)、[Data Pack](../resources/index.md#data) 和 [Pack.mcmeta](../resources/index.md#packmcmeta)_

Feature Pack 是一种不仅能加载资源和/或数据，还能开启一组指定 Feature Flag 的 Pack。这些 Flag 定义在该 Pack 根目录的 `pack.mcmeta` JSON 文件中，其格式如下：

:::info
此文件不同于模组 `resources/` 目录中的文件。它定义了一个全新的 Feature Pack，因此必须位于自己的文件夹中。
:::

```json5
{
    "features": {
        "enabled": [
            // Identifier of a Feature flag to be enabled
            // Must be a valid registered flag
            "examplemod:experimental"
        ]
    },
    "pack": { /*...*/ }
}
```

用户可以通过几种方式获得 Feature Pack，例如从外部来源将其作为 Data Pack 安装，或者下载内置 Feature Pack 的模组。随后，两者都需要依据[物理端](../concepts/sides.md)以不同方式安装。

### 内置

内置 Pack 会随模组捆绑，并通过 `AddPackFindersEvent` 事件提供给游戏。

```java
@SubscribeEvent // on the mod event bus
public static void addFeaturePacks(final AddPackFindersEvent event) {
    event.addPackFinders(
            // Path relative to your mods 'resources' pointing towards this pack
            // Take note this also defines your packs id using the following format
            // mod/<namespace>:<path>`, e.g. `mod/examplemod:data/examplemod/datapacks/experimental`
            Identifier.fromNamespaceAndPath("examplemod", "data/examplemod/datapacks/experimental"),
            
            // What kind of resources are contained within this pack
            // 'CLIENT_RESOURCES' for packs with client assets (resource packs)
            // 'SERVER_DATA' for packs with server data (data packs)
            PackType.SERVER_DATA,
            
            // Display name shown in the Experiments screen
            Component.literal("ExampleMod: Experiments"),
            
            // In order for this pack to load and enable feature flags, this MUST be 'FEATURE',
            // any other PackSource type is invalid here
            PackSource.FEATURE,
            
            // If this is true, the pack is always active and cannot be disabled, should always be false for feature packs
            false,
            
            // Priority to load resources from this pack in
            // 'TOP' this pack will be prioritized over other packs
            // 'BOTTOM' other packs will be prioritized over this pack 
            Pack.Position.TOP
    );
}
```

#### 在单人游戏中启用

1. 创建一个新世界。
2. 前往 Experiments 界面。
3. 开启所需的 Pack。
4. 单击 `Done` 确认更改。

#### 在多人游戏中启用

1. 打开服务器的 `server.properties` 文件。
2. 将 Feature Pack ID 添加到 `initial-enabled-packs`，各 Pack 之间用 `,` 分隔。Pack ID 在注册 Pack Finder 时定义，如上所示。

### 外部

外部 Pack 以 Data Pack 形式提供给用户。

#### 在单人游戏中安装

1. 创建一个新世界。
2. 前往 Data Pack 选择界面。
3. 将 Data Pack ZIP 文件拖放到游戏窗口中。
4. 把新出现的 Data Pack 移到 `Selected` Pack 列表中。
5. 单击 `Done` 确认更改。

此时游戏会警告你新选中的所有实验性功能，以及可能出现的缺陷、问题和崩溃。可以单击 `Proceed` 确认这些更改，也可以单击 `Details` 查看所有已选 Pack 及其将启用功能的完整列表。

:::info
外部 Feature Pack 不会显示在 Experiments 界面中。Experiments 界面只显示内置 Feature Pack。

如果要在启用后禁用外部 Feature Pack，请返回 Data Pack 界面，把外部 Pack 从 `Selected` 移回 `Available`。
:::

#### 在多人游戏中安装

Feature Pack 只能在首次创建世界时启用，一旦启用便不能禁用。

1. 创建目录 `./world/datapacks`
2. 将 Data Pack ZIP 文件上传到新建目录
3. 打开服务器的 `server.properties` 文件
4. 将 Data Pack ZIP 文件名（不含 `.zip`）添加到 `initial-enabled-packs`（各 Pack 之间用 `,` 分隔）
   - 示例：ZIP 文件 `examplemod-experimental.zip` 应按如下方式添加：`initial-enabled-packs=vanilla,examplemod-experimental`

### 数据生成

_另请参阅：[数据生成](../resources/index.md#data-generation)_

Feature Pack 可以在常规模组数据生成过程中生成。这种方式最适合与内置 Pack 结合使用，但也可以把生成结果压缩成 ZIP，作为外部 Pack 分享。两种形式只能选择一种，即不要既将其作为外部 Pack 提供，又将其作为内置 Pack 捆绑。

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(final GatherDataEvent.Client event) {
    DataGenerator generator = event.getGenerator();
    
    // To generate a feature pack, you must first obtain a pack generator instance for the desired pack.
    // generator.getBuiltinDatapack(<shouldGenerate>, <namespace>, <path>);
    // This will generate the feature pack into the following path:
    // ./data/<namespace>/datapacks/<path>
    PackGenerator featurePack = generator.getBuiltinDatapack(true, "examplemod", "experimental");
        
    // Register a provider to generate the `pack.mcmeta` file.
    featurePack.addProvider(output -> PackMetadataGenerator.forFeaturePack(
            output,
            
            // Description displayed in the Experiments screen
            Component.literal("Enabled experimental features for ExampleMod"),
            
            // Set of Feature flags this pack should enable
            FeatureFlagSet.of(EXPERIMENTAL)
    ));
    
    // Register additional providers (recipes, loot tables) to `featurePack` to write any generated resources into this pack, rather than the root pack.
}
```

