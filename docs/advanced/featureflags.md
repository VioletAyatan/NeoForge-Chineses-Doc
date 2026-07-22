# 功能标志（Feature Flags）

功能标志是一种系统，开发者可以让一组功能以某些必需标志为启用条件；这些功能可以是注册元素、游戏机制、数据包条目，或模组特有的其他系统。

常见用例是把实验性功能或元素置于一个实验性标志之后，让用户能够在这些功能最终定稿前方便地开启并试用。

:::tip
你并非必须添加自己的标志。如果原版中有适合用例的标志，可以直接为你的方块、物品、实体等设置该标志。

例如，在 `1.21.3` 中，如果你要扩充苍白橡木的木质方块集合，就只应在 `WINTER_DROP` 标志启用时显示它们。
:::

## 创建功能标志 {#creating-a-feature-flag}

要创建新的功能标志，需要创建一个 JSON 文件，并在 `neoforge.mods.toml` 文件的 `[[mods]]` 块中通过 `featureFlags` 条目引用它。指定路径必须相对于 `resources` 目录：

```toml
# 在 neoforge.mods.toml 中：
[[mods]]
# 该文件路径相对于资源输出目录；编译后则相对于 jar 内的根路径
# 'resources' 目录表示资源的根输出目录
    featureFlags="META-INF/feature_flags.json"
```

条目定义由功能标志名称列表组成，这些名称会在游戏初始化期间加载并注册。

```json5
{
    "flags": [
        // 要注册的 Feature Flag 的 Identifier
        "examplemod:experimental"
    ]
}
```

## 获取功能标志 {#retrieving-the-feature-flag}

可以通过 `FeatureFlagRegistry.getFlag(Identifier)` 获取已注册的功能标志。模组初始化期间随时都可以这样做。建议将结果保存到某处供以后使用，不要在每次需要标志时都查询注册表。

```java
// 查找 'examplemod:experimental' Feature Flag
public static final FeatureFlag EXPERIMENTAL = FeatureFlags.REGISTRY.getFlag(Identifier.fromNamespaceAndPath("examplemod", "experimental"));
```

## 功能元素（Feature Element） {#feature-elements}

`FeatureElement` 是可指定一组必需标志的注册表值。只有当相应的必需标志与 `Level` 中启用的标志匹配时，玩家才能使用这些值。

功能元素禁用后，会从玩家视野中完全隐藏，并跳过所有交互。请注意，这些禁用的元素仍存在于注册表中，只是在功能上无法使用。

下面列出了所有直接实现 `FeatureElement` 系统的注册表：

- Item
- Block
- EntityType
- MenuType
- Potion
- MobEffect
- GameRule

### 为元素设置标志 {#flagging-elements}

要把某个 `FeatureElement` 标记为需要你的功能标志，只需把它与其他所需标志一并传入相应的注册方法：

- `Item`: `Item.Properties#requiredFeatures`
- `Block`: `BlockBehaviour.Properties#requiredFeatures`
- `EntityType`: `EntityType.Builder#requiredFeatures`
- `MenuType`: `MenuType#new`
- `Potion`: `Potion#requiredFeatures`
- `MobEffect`: `MobEffect#requiredFeatures`
- `GameRule`: `GameRule#new`

```java
// 这些元素仅在启用 'EXPERIMENTAL' Flag 后可用

// Item
DeferredRegister.Items ITEMS = DeferredRegister.createItems("examplemod");
DeferredItem<Item> EXPERIMENTAL_ITEM = ITEMS.registerSimpleItem("experimental", props -> props
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
);

// Block
DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("examplemod");
// 请注意，BlockBehaviour.Properties#ofFullCopy 和 BlockBehaviour.Properties#ofLegacyCopy 会复制所需功能。
// 这意味着在 1.21.3 中，使用 BlockBehaviour.Properties.ofFullCopy(Blocks.PALE_OAK_WOOD) 会使方块需要 'WINTER_DROP' Flag。
DeferredBlock<Block> EXPERIMENTAL_BLOCK = BLOCKS.registerSimpleBlock("experimental", BlockBehaviour.Properties.of()
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
);

// BlockItem 的特殊之处在于，它会从对应的 Block 继承所需功能。
// 生成刷怪蛋及其对应的 EntityType 也是如此。
DeferredItem<BlockItem> EXPERIMENTAL_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(EXPERIMENTAL_BLOCK);

// EntityType
DeferredRegister<EntityType<?>> ENTITY_TYPES = DeferredRegister.create(Registries.ENTITY_TYPE, "examplemod");
DeferredHolder<EntityType<?>, EntityType<ExperimentalEntity>> EXPERIMENTAL_ENTITY = ENTITY_TYPES.register("experimental", registryName -> EntityType.Builder.of(ExperimentalEntity::new, MobCategory.AMBIENT)
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
    .build(ResourceKey.create(Registries.ENTITY_TYPE, registryName))
);

// MenuType
DeferredRegister<MenuType<?>> MENU_TYPES = DeferredRegister.create(Registries.MENU, "examplemod");
DeferredHolder<MenuType<?>, MenuType<ExperimentalMenu>> EXPERIMENTAL_MENU = MENU_TYPES.register("experimental", () -> new MenuType<>(
// 使用原版的 MenuSupplier：
// 当菜单在 `player.openMenu` 期间不编码复杂数据时使用。示例：
    // (windowId, inventory) -> new ExperimentalMenu(windowId, inventory),

// 使用 NeoForge 的 IContainerFactory：
// 当需要读取 `player.openMenu` 期间编码的复杂数据时使用。
// 此处的类型转换很重要，因为 `MenuType` 明确要求 `MenuSupplier`。
    (IContainerFactory<ExperimentalMenu>) (windowId, inventory, buffer) -> new ExperimentalMenu(windowId, inventory, buffer),
    
    FeatureFlagSet.of(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
));

// MobEffect
DeferredRegister<MobEffect> MOB_EFFECTS = DeferredRegister.create(Registries.MOB_EFFECT, "examplemod");
DeferredHolder<MobEffect, ExperimentalMobEffect> EXPERIMENTAL_MOB_EEFECT = MOB_EFFECTS.register("experimental", registryName -> new ExperimentalMobEffect(MobEffectCategory.NEUTRAL, CommonColors.WHITE)
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
);

// Potion
DeferredRegister<Potion> POTIONS = DeferredRegister.create(Registries.POTION, "examplemod");
DeferredHolder<Potion, ExperimentalPotion> EXPERIMENTAL_POTION = POTIONS.register("experimental", registryName -> new ExperimentalPotion(registryName.toString(), new MobEffectInstance(EXPERIMENTAL_MOB_EEFECT))
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
);

// GameRule
DeferredRegister<GameRule> GAME_RULES = DefeferredRegister.create(Registries.GAME_RULE, "examplemod");
DeferredHolder<GameRule, GameRule> EXPERIMENTAL_GAME_RULE = GAME_RULES.register("experimental", registryName -> new GameRule(
    GameRuleCategory.MISC, GameRuleType.BOOL, BoolArgumentType.bool(), GameRuleTypeVisitor::visitBoolean, Codec.BOOL, bool -> bool ? 1 : 0, false,
    FeatureFlagSet.of(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' Flag
));
```

### 验证启用状态 {#validating-enabled-status}

要验证功能是否应启用，必须先取得已启用功能的集合。这可以通过多种方式完成，常用且推荐的方法是 `LevelReader#enabledFeatures`。  

```java
level.enabledFeatures(); // 来自 'LevelReader' 实例
entity.level().enabledFeatures(); // 来自 'Entity' 实例

// 客户端
minecraft.getConnection().enabledFeatures();

// 服务端
server.getWorldData().enabledFeatures();
```

要验证任意 `FeatureFlagSet` 是否启用，可以把已启用功能传给 `FeatureFlagSet#isSubsetOf`；要验证特定 `FeatureElement` 是否启用，可以调用 `FeatureElement#isEnabled`。

:::info
`ItemStack` 有一个特殊的 `isItemEnabled(FeatureFlagSet)` 方法。这样，即使作为基础的 `Item` 所需功能与已启用功能不匹配，空堆叠仍会被视为已启用。建议尽可能优先使用此方法，而不是 `Item#isEnabled`。
:::

```java
requiredFeatures.isSubsetOf(enabledFeatures);
featureElement.isEnabled(enabledFeatures);
itemStack.isItemEnabled(enabledFeatures);
```

## 功能包（Feature Pack） {#feature-packs}

_另请参阅：[资源包](../resources/index.md#assets)、[数据包](../resources/index.md#data) 和 [Pack.mcmeta](../resources/index.md#packmcmeta)_

功能包是一种不仅能加载资源和/或数据，还能开启一组指定功能标志的包。这些标志定义在该包根目录的 `pack.mcmeta` JSON 文件中，其格式如下：

:::info
此文件不同于模组 `resources/` 目录中的文件。它定义了一个全新的功能包，因此必须位于自己的文件夹中。
:::

```json5
{
    "features": {
        "enabled": [
            // 要启用的 Feature Flag 的 Identifier
            // 必须是有效的已注册 Flag
            "examplemod:experimental"
        ]
    },
    "pack": { /*...*/ }
}
```

用户可以通过几种方式获得功能包，例如从外部来源将其作为数据包安装，或者下载内置功能包的模组。随后，两者都需要依据[物理端](../concepts/sides.md)以不同方式安装。

### 内置 {#built-in}

内置包会随模组捆绑，并通过 `AddPackFindersEvent` 事件提供给游戏。

```java
@SubscribeEvent // 位于模组事件总线上
public static void addFeaturePacks(final AddPackFindersEvent event) {
    event.addPackFinders(
            // 指向此 Pack 的路径，相对于模组的 'resources'
            // 请注意，这也会按以下格式定义 Pack 的 ID
            // mod/<namespace>:<path>`, e.g. `mod/examplemod:data/examplemod/datapacks/experimental`
            Identifier.fromNamespaceAndPath("examplemod", "data/examplemod/datapacks/experimental"),
            
            // 此 Pack 中包含的资源类型
            // 包含客户端资产的 Pack（Resource Pack）使用 'CLIENT_RESOURCES'
            // 包含服务端数据的 Pack（Data Pack）使用 'SERVER_DATA'
            PackType.SERVER_DATA,
            
            // 显示在 Experiments 界面中的名称
            Component.literal("ExampleMod: Experiments"),
            
            // 要让此 Pack 加载并启用 Feature Flag，此处必须为 'FEATURE'，
            // 任何其他 PackSource 类型在此处均无效
            PackSource.FEATURE,
            
            // 若为 true，此 Pack 将始终处于活动状态且无法禁用；对于 Feature Pack，应始终设为 false
            false,
            
            // 从此 Pack 加载资源的优先级
            // 'TOP' 表示此 Pack 的优先级高于其他 Pack
            // 'BOTTOM' 表示其他 Pack 的优先级高于此 Pack
            Pack.Position.TOP
    );
}
```

#### 在单人游戏中启用 {#enabling-in-singleplayer}

1. 创建一个新世界。
2. 前往实验功能界面。
3. 开启所需的包。
4. 单击 `Done` 确认更改。

#### 在多人游戏中启用 {#enabling-in-multiplayer}

1. 打开服务器的 `server.properties` 文件。
2. 将功能包 ID 添加到 `initial-enabled-packs`，各包之间用 `,` 分隔。包 ID 在注册包查找器时定义，如上所示。

### 外部 {#external}

外部包以数据包形式提供给用户。

#### 在单人游戏中安装 {#installation-in-singleplayer}

1. 创建一个新世界。
2. 前往数据包选择界面。
3. 将数据包 ZIP 文件拖放到游戏窗口中。
4. 把新出现的数据包移到 `Selected` 包列表中。
5. 单击 `Done` 确认更改。

此时游戏会警告你新选中的所有实验性功能，以及可能出现的缺陷、问题和崩溃。可以单击 `Proceed` 确认这些更改，也可以单击 `Details` 查看所有已选包及其将启用功能的完整列表。

:::info
外部功能包不会显示在实验功能界面中。实验功能界面只显示内置功能包。

如果要在启用后禁用外部功能包，请返回数据包界面，把外部包从 `Selected` 移回 `Available`。
:::

#### 在多人游戏中安装 {#installation-in-multiplayer}

功能包只能在首次创建世界时启用，一旦启用便不能禁用。

1. 创建目录 `./world/datapacks`
2. 将数据包 ZIP 文件上传到新建目录
3. 打开服务器的 `server.properties` 文件
4. 将数据包 ZIP 文件名（不含 `.zip`）添加到 `initial-enabled-packs`（各包之间用 `,` 分隔）
   - 示例：ZIP 文件 `examplemod-experimental.zip` 应按如下方式添加：`initial-enabled-packs=vanilla,examplemod-experimental`

### 数据生成 {#data-generation}

_另请参阅：[数据生成](../resources/index.md#data-generation)_

功能包可以在常规模组数据生成过程中生成。这种方式最适合与内置包结合使用，但也可以把生成结果压缩成 ZIP，作为外部包分享。两种形式只能选择一种，即不要既将其作为外部包提供，又将其作为内置包捆绑。

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(final GatherDataEvent.Client event) {
    DataGenerator generator = event.getGenerator();
    
    // 要生成 Feature Pack，必须先取得目标 Pack 的 PackGenerator 实例。
    // generator.getBuiltinDatapack(<shouldGenerate>, <namespace>, <path>);
    // 这会将 Feature Pack 生成到以下路径：
    // ./data/<namespace>/datapacks/<path>
    PackGenerator featurePack = generator.getBuiltinDatapack(true, "examplemod", "experimental");
        
    // 注册用于生成 `pack.mcmeta` 文件的 Provider。
    featurePack.addProvider(output -> PackMetadataGenerator.forFeaturePack(
            output,
            
            // 显示在 Experiments 界面中的说明
            Component.literal("Enabled experimental features for ExampleMod"),
            
            // 此 Pack 应启用的 Feature Flag 集合
            FeatureFlagSet.of(EXPERIMENTAL)
    ));
    
    // 向 `featurePack` 注册其他 Provider（配方、战利品表），使生成的资源写入此 Pack，而不是根 Pack。
}
```

