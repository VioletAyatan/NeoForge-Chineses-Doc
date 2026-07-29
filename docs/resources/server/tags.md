# 标签（Tags）

简单来说，标签是由同一类型的已注册对象组成的列表。标签从数据文件加载，可用于检查成员关系。例如，合成木棍时接受任意组合的木板（带有 `minecraft:planks` 标签的物品）。标签通常通过 `#` 前缀与“普通”对象区分开（例如 `#minecraft:planks`，而普通对象为 `minecraft:oak_planks`）。

任何[注册表][registry]都可以拥有标签文件——虽然方块和物品是最常见的用例，但流体、实体类型或伤害类型等其他注册表也经常使用标签。如有需要，也可以创建自己的标签。

对于 Minecraft 注册表，标签位于 `data/<tag_namespace>/tags/<registry_path>/<tag_path>.json`；对于非 Minecraft 注册表，标签位于 `data/<tag_namespace>/tags/<registry_namespace>/<registry_path>/<tag_path>.json`。例如，要修改 `minecraft:planks` 物品标签，应将标签文件放在 `data/minecraft/tags/item/planks.json`。

:::info
与大多数其他 NeoForge 数据文件不同，NeoForge 添加的标签通常不使用 `neoforge` 命名空间，而是使用 `c` 命名空间（例如 `c:ingots/gold`）。这是应许多同时面向多个加载器开发的模组开发者要求，在 NeoForge 与 Fabric 模组加载器之间统一标签的结果。

少数与 NeoForge 系统紧密关联的标签不遵循此规则，例如许多 [伤害类型][damagetype] 标签。
:::

覆盖标签文件通常是追加而非替换。也就是说，如果两个数据包指定了相同 id 的标签文件，两者内容会被合并（除非另有指定）。这使标签不同于大多数其他数据文件；后者会替换所有现有值。

## 标签文件格式

标签文件采用以下语法：

```json5
{
    // 标签的值。
    "values": [
        // 值对象。必须指定要添加对象的 ID，以及该对象是否为必需项。
        // 如果条目为必需项但对象不存在，该标签将无法加载。"required" 字段
        // 实际上是可选的；省略时，该条目等同于下面的简写形式。
        {
            "id": "examplemod:example_ingot",
            "required": false
        }
        // {"id": "minecraft:gold_ingot", "required": true} 的简写，即必需条目。
        "minecraft:gold_ingot",
        // 标签对象，以开头的 # 与普通条目区分。在此例中，所有木板
        // 都会视为该标签的条目。与普通条目一样，也可以使用 "id"/"required" 格式。
        // 警告：循环标签依赖关系将导致数据包无法加载！
        "#minecraft:planks"
    ],
    // 是先移除所有已有条目再添加自己的条目（true），还是仅追加自己的条目（false）。
    // 通常应为 false；设为 true 的选项主要面向数据包开发者。
    "replace": false,
    // （可选，NeoForge 新增）以更细粒度的方式从标签中移除已有条目。
    // 条目语法与 "values" 数组相同。
    "remove": [
        "minecraft:iron_ingot"
    ]
}
```

## 查找与命名标签

查找现有标签时，通常建议遵循以下步骤：

- 查看 Minecraft 标签中是否存在所需标签。Minecraft 标签可在 `BlockTags`、`ItemTags`、`EntityTypeTags` 等类中找到。
- 如果没有，再查看 NeoForge 标签中是否存在所需标签。NeoForge 标签可在 `Tags.Blocks`、`Tags.Items`、`Tags.EntityTypes` 等类中找到。
- 若仍未找到，则可认为 Minecraft 与 NeoForge 都未定义该标签，需要自行创建。

创建自己的标签时，应考虑以下问题：

- 它是否用于修改自己的模组行为？如果是，该标签应放在模组自己的命名空间中。（例如，“我的对象可以在这种方块上生成”一类标签经常如此。）
- 其他模组是否也会想使用该标签？如果是，该标签应放在 `c` 命名空间中。（例如，新金属或宝石经常如此。）
- 其他情况下，使用自己的模组命名空间。

标签本身的命名也应遵循一些约定：

- 使用复数形式。例如：`minecraft:planks`、`c:ingots`。
- 对同一类型的多个对象使用文件夹，并为每个文件夹提供一个总标签。例如：`c:ingots/iron`、`c:ingots/gold`，以及同时包含两者的 `c:ingots`。（注意：这是 NeoForge 的约定，Minecraft 的大多数标签并不遵循此约定。）

## 使用标签

要在代码中引用标签，必须使用[注册表键][regkey]和[标识符][identifier]创建 `TagKey<T>`，其中 `T` 是标签类型（`Block`、`Item`、`EntityType<?>` 等）：

```java
public static final TagKey<Block> MY_TAG = TagKey.create(
        // 注册表项。注册表的类型必须与标签的泛型类型相匹配。
        Registries.BLOCK,
        // 标签的位置。此示例将把标签放在 data/examplemod/tags/blocks/example_tag.json。
        Identifier.fromNamespaceAndPath("examplemod", "example_tag")
);
```

:::warning
由于 `TagKey` 是 record，其构造器是 public。不过，不应直接使用该构造器，否则可能引发各种问题，例如查询标签条目时出现问题。
:::

随后可以使用标签执行各种操作。先从最直观的操作开始：检查对象是否位于标签中。以下示例使用方块标签，但除非另有说明，所有类型的标签都具有完全相同的功能：

```java
// 检查泥土是否位于我们的标签中。
// 假设可访问 Level level
boolean isInTag = level.registryAccess().lookupOrThrow(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG).stream().anyMatch(holder -> holder.is(Items.DIRT));
```

由于这一写法很冗长，尤其是在频繁使用时，因此标签系统最常见的两个使用者 `BlockState` 和 `ItemStack` 都定义了 `#is` 辅助方法，用法如下：

```java
// 检查 blockState 的方块是否在我们的标签中。
boolean isInBlockTag = blockState.is(MY_TAG);
// 检查 itemStack 的物品是否在标签中。这里假定 MY_ITEM_TAG 以 TagKey<Item> 形式存在。
boolean isInItemTag = itemStack.is(MY_ITEM_TAG);
```

如有需要，也可以获取一组标签条目并对其进行流式处理：

```java
// 假设可访问 Level level
Stream<Holder<Block>> blocksInTag = level.registryAccess().lookupOrThrow(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG).stream();
```

### 引导期间静态注册表的标签

有时需要在注册过程中访问 `HolderSet`。在[数据组件上下文][datacomponent]中，初始化器会提供 `HolderLookup.Provider` 以供解析：

```java
Item.Properties props = new Item.Properties().delayedComponent(
    // 要初始化的组件
    DataComponents.DAMAGE_RESISTANT,
    // 初始化函数，通常至少提供注册表查找
    registries -> new DamageResistant(
        // 从 TagKey 获取 HolderSet
        registries.getOrThrow(DamageTypeTags.IS_FIRE)
    )
);
```

在数据组件上下文之外，**仅对静态注册表**，可以通过 `BuiltInRegistries#acquireBootstrapRegistrationLookup` 获取所需的 `HolderGetter`：

```java
// 假设可访问 Level level
HolderSet<Block> blockTag = BuiltInRegistries.acquireBootstrapRegistrationLookup(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG);
```

## 数据生成

与许多其他 JSON 文件一样，标签可以通过[数据生成][datagen]创建。每种标签都有自己的数据生成基类——方块标签一个类、物品标签一个类，依此类推——因此每种标签也都需要一个类。所有这些类都扩展 `TagsProvider<T>` 基类，其中 `T` 同样是标签类型（`Block`、`Item` 等）。`TagsProvider` 又主要分为两类：`IntrinsicHolderTagsProvider<T>` 通常用于静态注册表对象，允许直接把对象传给标签；`KeyTagProvider` 通常用于数据包注册表对象，允许把对象的 `ResourceKey` 传给标签。另有 `HolderTagProvider<T>`，用于由 `Holder` 包装的静态注册表对象，不过原版只将它用于药水标签。

下表列出了不同对象所使用的标签提供器：

| 类型                       | 标签提供器类                           | 提供器类型                    |
|----------------------------|----------------------------------------|-------------------------------|
| `BannerPattern`            | `BannerPatternTagsProvider`            | `KeyTagProvider`              |
| `Biome`                    | `BiomeTagsProvider`                    | `KeyTagProvider`              |
| `Block`                    | `BlockTagsProvider`\*                  | `IntrinsicHolderTagsProvider` |
| `ConfiguredFeature`        | `FeatureTagsProvider`                  | `KeyTagProvider`              |
| `DamageType`               | `DamageTypeTagsProvider`               | `KeyTagProvider`              |
| `Dialog`                   | `DialogTagsProvider`                   | `KeyTagProvider`              |
| `Enchantment`              | `EnchantmentTagsProvider`              | `KeyTagProvider`              |
| `EntityType`               | `EntityTypeTagsProvider`               | `IntrinsicHolderTagsProvider` |
| `FlatLevelGeneratorPreset` | `FlatLevelGeneratorPresetTagsProvider` | `IntrinsicHolderTagsProvider` |
| `Fluid`                    | `FluidTagsProvider`                    | `KeyTagProvider`              |
| `GameEvent`                | `GameEventTagsProvider`                | `KeyTagProvider`              |
| `Instrument`               | `InstrumentTagsProvider`               | `KeyTagProvider`              |
| `Item`                     | `ItemTagsProvider`\*                   | `IntrinsicHolderTagsProvider` |
| `PaintingVariant`          | `PaintingVariantTagsProvider`          | `KeyTagProvider`              |
| `PoiType`                  | `PoiTypeTagsProvider`                  | `KeyTagProvider`              |
| `Potion`                   | `PotionTagsProvider`                   | `HolderTagProvider`           |
| `Structure`                | `StructureTagsProvider`                | `KeyTagProvider`              |
| `Timeline`                 | `TimelineTagsProvider`                 | `KeyTagProvider`              |
| `VillagerTrade`            | `VillagerTradesTagsProvider`           | `KeyTagProvider`              |
| `WorldPreset`              | `WorldPresetTagsProvider`              | `KeyTagProvider`              |


\* 这些提供器由 NeoForge 提供。

作为示例，假设我们要生成方块标签（内在 Holder）：

```java
public class MyBlockTagsProvider extends BlockTagsProvider {
    // 从 `GatherDataEvent` 之一获取参数。
    public MyBlockTagsProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        super(output, lookupProvider, ExampleMod.MOD_ID);
    }

    // 在此添加你的标签条目。
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // 为我们的标签创建一个 TagAppender 注册表对象。这也可能是例如普通标签或 NeoForge 标签。
        this.tag(MY_TAG)
            // 添加条目。这是一个可变参数。
            // 键标签提供器必须在此处提供 ResourceKeys 而不是实际对象。
            .add(Blocks.DIRT, Blocks.COBBLESTONE)
            // 添加可选条目，如果不存在则将被忽略。此示例使用 Botania 的 Pure Daisy。
            // 这不是可变参数。
            .add(TagEntry.optionalElement(Identifier.fromNamespaceAndPath("botania", "pure_daisy")))
            // 添加标签条目。
            .addTag(BlockTags.PLANKS)
            // 添加多个标签条目。这是一个可变参数。
            // 可能导致未经检查的警告，但可以安全地抑制。
            .addTags(BlockTags.LOGS, BlockTags.WOODEN_SLABS)
            // 添加可选标签条目，如果不存在则将被忽略。
            .addOptionalTag(ItemTags.create(Identifier.fromNamespaceAndPath("c", "ingots/tin")))
            // 添加多个可选标签条目。这是一个可变参数。
            // 可能导致未经检查的警告，但可以安全地抑制。
            .addOptionalTags(ItemTags.create(Identifier.fromNamespaceAndPath("c", "nuggets/tin")), ItemTags.create(Identifier.fromNamespaceAndPath("c", "storage_blocks/tin")))
            // 将 replace 属性设置为 true。
            .replace()
            // 将 replace 属性设置回 false。
            .replace(false)
            // 删除条目。这是一个可变参数。
            // 键标签提供器必须在此处提供 ResourceKeys 而不是实际对象。
            // 可能导致未经检查的警告，但可以安全地抑制。
            .remove(Blocks.CRIMSON_SLAB, Blocks.WARPED_SLAB);
    }
}
```

此示例会生成以下标签 JSON：

```json5
{
    "values": [
        "minecraft:dirt",
        "minecraft:cobblestone",
        {
            "id": "botania:pure_daisy",
            "required": false
        },
        "#minecraft:planks",
        "#minecraft:logs",
        "#minecraft:wooden_slabs",
        {
            "id": "c:ingots/tin",
            "required": false
        },
        {
            "id": "c:nuggets/tin",
            "required": false
        },
        {
            "id": "c:storage_blocks/tin",
            "required": false
        }
    ],
    "remove": [
        "minecraft:crimson_slab",
        "minecraft:warped_slab"
    ]
}
```

与所有数据提供器一样，请将每个标签提供器添加到 `GatherDataEvent`：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，请先调用 event.createDatapackRegistryObjects(...)

    event.createProvider(MyBlockTagsProvider::new);
}
```

### 自定义标签提供器

无论面向现有还是自定义[注册表][registry]，只需扩展 `TagsProvider<T>` 即可创建自定义标签提供器，其中 `T` 是要为其生成标签的注册表对象。

```java
public class MyRecipeTypeTagsProvider extends TagsProvider<RecipeType<?>> {
    // 从 `GatherDataEvent` 获取参数。
    public MyRecipeTypeTagsProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        // 第二个参数是我们为其生成标签的注册表项。
        super(output, Registries.RECIPE_TYPE, lookupProvider, ExampleMod.MOD_ID);
    }
    
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) { /*...*/ }
}
```

接下来，通过 `getOrCreateRawBuilder` 创建 `TagBuilder`，由提供器生成标签。该 builder 包含按 `Identifier` 添加或移除元素及标签的方法。此外，还可以通过 `setReplace` 指定 `replace` 属性：

```java
public class MyRecipeTypeTagsProvider extends TagsProvider<RecipeType<?>> {
    
    // ...

    // 假设以下 TagKey<RecipeType<?>> SMELTERS、CRAFTERS、SMITHERS
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // 为 `Identifier` 创建 TagBuilder。
        this.getOrCreateRawBuilder(MY_TAG)
            // 添加条目。
            .addElement(Identifier.fromNamespaceAndPath("minecraft", "crafting"))
            .addElement(Identifier.fromNamespaceAndPath("minecraft", "smelting"))
            // 添加可选条目，如果不存在则将被忽略。
            .addOptionalElement(Identifier.fromNamespaceAndPath("minecraft", "blasting"))
            // 添加标签条目。
            .addTag(SMELTERS.location())
            // 添加可选标签条目，如果不存在则将被忽略。
            .addOptionalTag(CRAFTERS.location())
            // 将 replace 属性设置为 true。
            .setReplace(true)
            // 将 replace 属性设置回 false。
            .setReplace(false)
            // 删除条目。
            .removeElement(Identifier.fromNamespaceAndPath("minecraft", "campfire_cooking"))
            // 删除标签条目。
            .removeTag(SMITHERS.location());
    }
}
```

目前，整个标签都由 `Identifier` 构造。然而，每次都指定原始标识符可能很繁琐，尤其是在已有 `ResourceKey` 或直接对象时。`TagAppender` 正是为此而生。`TagAppender<E, T>` 在功能上是对 `TagBuilder` 的包装：它接收某个任意条目对象 `E`，并将其转换为针对注册表对象 `T` 的 `TagBuilder` 调用。只要能将新的对象类型转换为先前的条目对象 `E`，便可通过 `map` 将 `TagAppender` 重映射为任意对象。这基本就是 `KeyTagProvider` 与 `IntrinsicHolderTagsProvider` 所做的事情。二者都提供 `tag` 方法，用于创建 `TagAppender`，分别将 `ResourceKey` 映射为 `Identifier`，或将直接对象映射为 `Identifier`：

```java

public class MyRecipeTypeTagsProvider extends TagsProvider<RecipeType<?>> {
    
    // ...

    // 假设我们有 TagKey<RecipeType<?>> SMELTERS、CRAFTERS、SMITHERS
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // 为 `Identifier` 创建 TagAppender。
        this.tag(MY_TAG)
            // 替换 replace 属性信息
            .replace()
            // 处理可能不存在的任何可选元素
            .addOptional(Identifier.fromNamespaceAndPath("examplemod", "example_type"))
            // 可以接收 TagKey
            .addOptionalTag(CRAFTERS)

            // 映射至 ResourceKey（KeyTagProvider）
            .map((Function<ResourceKey<RecipeType<?>>, Identifier>) ResourceKey::location)
            .add(BuiltInRegistries.RECIPE_TYPE.getResourceKey(RecipeType.CRAFTING).orElseThrow())

            // 映射直接对象（IntrinsicHolderTagsProvider）
            .map((Function<RecipeType<?>, ResourceKey<RecipeType<?>>) type -> BuiltInRegistries.RECIPE_TYPE.getResourceKey(type).orElseThrow())
            .add(RecipeType.SMELTING)
            .addTag(SMELTERS)
            .remove(RecipeType.CAMPFIRE_COOKING)
            .remove(SMITHERS);
    }

    private TagAppender<Identifier, RecipeType<?>> tag(TagKey<RecipeType<?>> tag) {
        // 创建 builder
        TagBuilder builder = this.getOrCreateRawBuilder(tag);

        // 生成 appender（可以使用 TagAppender#forBuilder）
        return new TagAppender<Identifier, T>() {

            @Override
            public TagAppender<Identifier, T> add(Identifier element) {
                builder.addElement(element);
                return this;
            }

            @Override
            public TagAppender<Identifier, T> addOptional(Identifier element) {
                builder.addOptionalElement(element);
                return this;
            }

            @Override
            public TagAppender<Identifier, T> addTag(TagKey<T> tag) {
                builder.addTag(tag.location());
                return this;
            }

            @Override
            public TagAppender<Identifier, T> addOptionalTag(TagKey<T> tag) {
                builder.addOptionalTag(tag.location());
                return this;
            }

            // 适用于无法访问当前条目对象的情况
            @Override
            public TagAppender<Identifier, T> add(TagEntry entry) {
                builder.add(entry);
                return this;
            }

            @Override
            public TagAppender<Identifier, T> replace(boolean value) {
                builder.setReplace(value);
                return this;
            }

            @Override
            public TagAppender<Identifier, T> remove(Identifier element) {
                builder.removeElement(element);
                return this;
            }

            @Override
            public TagAppender<ResourceKey<T>, T> remove(TagKey<T> tag) {
                builder.removeTag(tag.location());
                return this;
            }
        };
    }
}
```

#### 复制标签内容

NeoForge 提供了一种特殊的 `IntrinsicHolderTagsProvider`，名为 `BlockTagCopyingItemTagProvider`，用于内容需要与关联方块标签保持一致的物品标签。此时不使用 `TagAppender`，而应调用 `copy`，传入要复制到物品标签的方块标签。

```java
public class ExampleBlockTagCopyingItemTagProvider extends BlockTagCopyingItemTagProvider {

    public ExampleBlockTagCopyingItemTagProvider(
        PackOutput output,
        CompletableFuture<HolderLookup.Provider> lookupProvider,
        CompletableFuture<TagLookup<Block>> blockTags // 从 BlockTagsProvider#contentsGetter 获取
    ) {
        super(output, lookupProvider, blockTags, ExampleMod.MOD_ID);
    }

    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // 假定两个参数的类型分别为 TagKey<Block> 和 TagKey<Item>
        this.copy(EXAMPLE_BLOCK_TAG, EXAMPLE_ITEM_TAG);

        // 你还可以在此处添加普通物品标签
    }

}
```

与所有数据提供器一样，复制标签提供器必须添加到 `GatherDataEvent`：

```java
@SubscribeEvent // 位于模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，请先调用 event.createDatapackRegistryObjects(...)

    event.createBlockAndItemTags(MyBlockTagsProvider::new, ExampleBlockTagCopyingItemTagProvider::new);
}
```

[damagetype]: damagetypes.md
[datacomponent]: ../../items/datacomponents.md
[datagen]: ../index.md#数据生成
[registry]: ../../concepts/registries.md
[regkey]: ../../misc/identifier.md#resourcekeys
[identifier]: ../../misc/identifier.md
