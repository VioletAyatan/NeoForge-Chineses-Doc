# 标签（Tags）

简单来说，标签是由同一类型的已注册对象组成的列表。标签从数据文件加载，可用于检查成员关系。例如，合成木棍时接受任意组合的木板（带有 `minecraft:planks` 标签的 Item）。标签通常通过 `#` 前缀与“普通”对象区分开（例如 `#minecraft:planks`，而普通对象为 `minecraft:oak_planks`）。

任何 [Registry][registry] 都可以拥有标签文件——虽然 Block 和 Item 是最常见的用例，但流体、Entity Type 或 Damage Type 等其他 Registry 也经常使用标签。如有需要，也可以创建自己的标签。

对于 Minecraft Registry，标签位于 `data/<tag_namespace>/tags/<registry_path>/<tag_path>.json`；对于非 Minecraft Registry，标签位于 `data/<tag_namespace>/tags/<registry_namespace>/<registry_path>/<tag_path>.json`。例如，要修改 `minecraft:planks` Item 标签，应将标签文件放在 `data/minecraft/tags/item/planks.json`。

:::info
与大多数其他 NeoForge 数据文件不同，NeoForge 添加的标签通常不使用 `neoforge` 命名空间，而是使用 `c` 命名空间（例如 `c:ingots/gold`）。这是应许多同时面向多个加载器开发的 mod 开发者要求，在 NeoForge 与 Fabric mod 加载器之间统一标签的结果。

少数与 NeoForge 系统紧密关联的标签不遵循此规则，例如许多 [Damage Type][damagetype] 标签。
:::

覆盖标签文件通常是追加而非替换。也就是说，如果两个数据包指定了相同 id 的标签文件，两者内容会被合并（除非另有指定）。这使标签不同于大多数其他数据文件；后者会替换所有现有值。

## 标签文件格式

标签文件采用以下语法：

```json5
{
    // The values of the tag.
    "values": [
        // A value object. Must specify the id of the object to add, and whether it is required.
        // If the entry is required, but the object is not present, the tag will not load. The "required" field
        // is technically optional, but when removed, the entry is equivalent to the shorthand below.
        {
            "id": "examplemod:example_ingot",
            "required": false
        }
        // Shorthand for {"id": "minecraft:gold_ingot", "required": true}, i.e. a required entry.
        "minecraft:gold_ingot",
        // A tag object. Distinguished from regular entries by the leading #. In this case, all planks
        // will be considered entries of the tag. Like normal entries, this can also have the "id"/"required" format.
        // Warning: Circular tag dependencies will lead to a datapack not being loaded!
        "#minecraft:planks"
    ],
    // Whether to remove all pre-existing entries before adding your own (true) or just add your own (false).
    // This should generally be false, the option to set this to true is primarily aimed at pack developers.
    "replace": false,
    // A finer-grained way to remove entries from the tag again, if present. Optional, NeoForge-added.
    // Entry syntax is the same as in the "values" array.
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

- 它是否用于修改自己的 mod 行为？如果是，该标签应放在 mod 自己的命名空间中。（例如，“我的对象可以在这种 Block 上生成”一类标签经常如此。）
- 其他 mod 是否也会想使用该标签？如果是，该标签应放在 `c` 命名空间中。（例如，新金属或宝石经常如此。）
- 其他情况下，使用自己的 mod 命名空间。

标签本身的命名也应遵循一些约定：

- 使用复数形式。例如：`minecraft:planks`、`c:ingots`。
- 对同一类型的多个对象使用文件夹，并为每个文件夹提供一个总标签。例如：`c:ingots/iron`、`c:ingots/gold`，以及同时包含两者的 `c:ingots`。（注意：这是 NeoForge 的约定，Minecraft 的大多数标签并不遵循此约定。）

## 使用标签

要在代码中引用标签，必须使用 [Registry 键][regkey]和[标识符][identifier]创建 `TagKey<T>`，其中 `T` 是标签类型（`Block`、`Item`、`EntityType<?>` 等）：

```java
public static final TagKey<Block> MY_TAG = TagKey.create(
        // The registry key. The type of the registry must match the generic type of the tag.
        Registries.BLOCK,
        // The location of the tag. This example will put our tag at data/examplemod/tags/blocks/example_tag.json.
        Identifier.fromNamespaceAndPath("examplemod", "example_tag")
);
```

:::warning
由于 `TagKey` 是 record，其构造器是 public。不过，不应直接使用该构造器，否则可能引发各种问题，例如查询标签条目时出现问题。
:::

随后可以使用标签执行各种操作。先从最直观的操作开始：检查对象是否位于标签中。以下示例使用 Block 标签，但除非另有说明，所有类型的标签都具有完全相同的功能：

```java
// Check whether dirt is in our tag.
// Assume access to Level level
boolean isInTag = level.registryAccess().lookupOrThrow(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG).stream().anyMatch(holder -> holder.is(Items.DIRT));
```

由于这一写法很冗长，尤其是在频繁使用时，因此标签系统最常见的两个使用者 `BlockState` 和 `ItemStack` 都定义了 `#is` 辅助方法，用法如下：

```java
// Check whether the blockState's block is in our tag.
boolean isInBlockTag = blockState.is(MY_TAG);
// Check whether the itemStack's item is in our tag. Assumes the existence of MY_ITEM_TAG as a TagKey<Item>.
boolean isInItemTag = itemStack.is(MY_ITEM_TAG);
```

如有需要，也可以获取一组标签条目并对其进行流式处理：

```java
// Assume access to Level level
Stream<Holder<Block>> blocksInTag = level.registryAccess().lookupOrThrow(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG).stream();
```

### 引导期间静态 Registry 的标签

有时需要在 Registry 过程中访问 `HolderSet`。在[数据组件上下文][datacomponent]中，初始化器会提供 `HolderLookup.Provider` 以供解析：

```java
Item.Properties props = new Item.Properties().delayedComponent(
    // The component to initialize
    DataComponents.DAMAGE_RESISTANT,
    // The initializer function, typically provides at least the registry lookup
    registries -> new DamageResistant(
        // Get the HolderSet from the TagKey
        registries.getOrThrow(DamageTypeTags.IS_FIRE)
    )
);
```

在数据组件上下文之外，**仅对静态 Registry**，可以通过 `BuiltInRegistries#acquireBootstrapRegistrationLookup` 获取所需的 `HolderGetter`：

```java
// Assume access to Level level
HolderSet<Block> blockTag = BuiltInRegistries.acquireBootstrapRegistrationLookup(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG);
```

## 数据生成

与许多其他 JSON 文件一样，标签可以通过[数据生成][datagen]创建。每种标签都有自己的数据生成基类——Block 标签一个类、Item 标签一个类，依此类推——因此每种标签也都需要一个类。所有这些类都扩展 `TagsProvider<T>` 基类，其中 `T` 同样是标签类型（`Block`、`Item` 等）。`TagsProvider` 又主要分为两类：`IntrinsicHolderTagsProvider<T>` 通常用于静态 Registry 对象，允许直接把对象传给标签；`KeyTagProvider` 通常用于数据包 Registry 对象，允许把对象的 `ResourceKey` 传给标签。另有 `HolderTagProvider<T>`，用于由 `Holder` 包装的静态 Registry 对象，不过原版只将它用于药水标签。

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

作为示例，假设我们要生成 Block 标签（内在 Holder）：

```java
public class MyBlockTagsProvider extends BlockTagsProvider {
    // Get parameters from one of the `GatherDataEvent`s.
    public MyBlockTagsProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        super(output, lookupProvider, ExampleMod.MOD_ID);
    }

    // Add your tag entries here.
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // Create a TagAppender of registry objects for our tag. This could also be e.g. a vanilla or NeoForge tag.
        this.tag(MY_TAG)
            // Add entries. This is a vararg parameter.
            // Key tag providers must provide ResourceKeys here instead of the actual objects.
            .add(Blocks.DIRT, Blocks.COBBLESTONE)
            // Add optional entries that will be ignored if absent. This example uses Botania's Pure Daisy.
            // This is not a vararg parameter.
            .add(TagEntry.optionalElement(Identifier.fromNamespaceAndPath("botania", "pure_daisy")))
            // Add a tag entry.
            .addTag(BlockTags.PLANKS)
            // Add multiple tag entries. This is a vararg parameter.
            // Can cause unchecked warnings that can safely be suppressed.
            .addTags(BlockTags.LOGS, BlockTags.WOODEN_SLABS)
            // Add an optional tag entry that will be ignored if absent.
            .addOptionalTag(ItemTags.create(Identifier.fromNamespaceAndPath("c", "ingots/tin")))
            // Add multiple optional tag entries. This is a vararg parameter.
            // Can cause unchecked warnings that can safely be suppressed.
            .addOptionalTags(ItemTags.create(Identifier.fromNamespaceAndPath("c", "nuggets/tin")), ItemTags.create(Identifier.fromNamespaceAndPath("c", "storage_blocks/tin")))
            // Set the replace property to true.
            .replace()
            // Set the replace property back to false.
            .replace(false)
            // Remove entries. This is a vararg parameter.
            // Key tag providers must provide ResourceKeys here instead of the actual objects.
            // Can cause unchecked warnings that can safely be suppressed.
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
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createProvider(MyBlockTagsProvider::new);
}
```

### 自定义标签提供器

无论面向现有还是自定义 [Registry][registry]，只需扩展 `TagsProvider<T>` 即可创建自定义标签提供器，其中 `T` 是要为其生成标签的 Registry 对象。

```java
public class MyRecipeTypeTagsProvider extends TagsProvider<RecipeType<?>> {
    // Get parameters from the `GatherDataEvent`s.
    public MyRecipeTypeTagsProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        // Second parameter is the registry key we are generating the tags for.
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

    // Lets assume the following TagKey<RecipeType<?>> SMELTERS, CRAFTERS, SMITHERS
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // Create a TagBuilder for `Identifier`s.
        this.getOrCreateRawBuilder(MY_TAG)
            // Add entries.
            .addElement(Identifier.fromNamespaceAndPath("minecraft", "crafting"))
            .addElement(Identifier.fromNamespaceAndPath("minecraft", "smelting"))
            // Add optional entries that will be ignored if absent.
            .addOptionalElement(Identifier.fromNamespaceAndPath("minecraft", "blasting"))
            // Add a tag entry.
            .addTag(SMELTERS.location())
            // Add an optional tag entry that will be ignored if absent.
            .addOptionalTag(CRAFTERS.location())
            // Set the replace property to true.
            .setReplace(true)
            // Set the replace property back to false.
            .setReplace(false)
            // Remove entries.
            .removeElement(Identifier.fromNamespaceAndPath("minecraft", "campfire_cooking"))
            // Remove a tag entry.
            .removeTag(SMITHERS.location());
    }
}
```

目前，整个标签都由 `Identifier` 构造。然而，每次都指定原始标识符可能很繁琐，尤其是在已有 `ResourceKey` 或直接对象时。`TagAppender` 正是为此而生。`TagAppender<E, T>` 在功能上是对 `TagBuilder` 的包装：它接收某个任意条目对象 `E`，并将其转换为针对 Registry 对象 `T` 的 `TagBuilder` 调用。只要能将新的对象类型转换为先前的条目对象 `E`，便可通过 `map` 将 `TagAppender` 重映射为任意对象。这基本就是 `KeyTagProvider` 与 `IntrinsicHolderTagsProvider` 所做的事情。二者都提供 `tag` 方法，用于创建 `TagAppender`，分别将 `ResourceKey` 映射为 `Identifier`，或将直接对象映射为 `Identifier`：

```java

public class MyRecipeTypeTagsProvider extends TagsProvider<RecipeType<?>> {
    
    // ...

    // Let's assume we have the TagKey<RecipeType<?>>s SMELTERS, CRAFTERS, SMITHERS
    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // Create the TagAppender for `Identifier`s.
        this.tag(MY_TAG)
            // Replace property info
            .replace()
            // Handle any optional elements that may not be present
            .addOptional(Identifier.fromNamespaceAndPath("examplemod", "example_type"))
            // Can take in a TagKey
            .addOptionalTag(CRAFTERS)

            // Map to ResourceKey (KeyTagProvider)
            .map((Function<ResourceKey<RecipeType<?>>, Identifier>) ResourceKey::location)
            .add(BuiltInRegistries.RECIPE_TYPE.getResourceKey(RecipeType.CRAFTING).orElseThrow())

            // Map to direct object (IntrinsicHolderTagsProvider)
            .map((Function<RecipeType<?>, ResourceKey<RecipeType<?>>) type -> BuiltInRegistries.RECIPE_TYPE.getResourceKey(type).orElseThrow())
            .add(RecipeType.SMELTING)
            .addTag(SMELTERS)
            .remove(RecipeType.CAMPFIRE_COOKING)
            .remove(SMITHERS);
    }

    private TagAppender<Identifier, RecipeType<?>> tag(TagKey<RecipeType<?>> tag) {
        // Create the builder
        TagBuilder builder = this.getOrCreateRawBuilder(tag);

        // Generate the appender (can use TagAppender#forBuilder) instead
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

            // For situations where you cannot access the current entry object
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

NeoForge 提供了一种特殊的 `IntrinsicHolderTagsProvider`，名为 `BlockTagCopyingItemTagProvider`，用于内容需要与关联 Block 标签保持一致的 Item 标签。此时不使用 `TagAppender`，而应调用 `copy`，传入要复制到 Item 标签的 Block 标签。

```java
public class ExampleBlockTagCopyingItemTagProvider extends BlockTagCopyingItemTagProvider {

    public ExampleBlockTagCopyingItemTagProvider(
        PackOutput output,
        CompletableFuture<HolderLookup.Provider> lookupProvider,
        CompletableFuture<TagLookup<Block>> blockTags // Obtained from BlockTagsProvider#contentsGetter
    ) {
        super(output, lookupProvider, blockTags, ExampleMod.MOD_ID);
    }

    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        // Assuming types TagKey<Block> and TagKey<Item> for the two parameters
        this.copy(EXAMPLE_BLOCK_TAG, EXAMPLE_ITEM_TAG);

        // You can also add normal item tags here
    }

}
```

与所有数据提供器一样，复制标签提供器必须添加到 `GatherDataEvent`：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createBlockAndItemTags(MyBlockTagsProvider::new, ExampleBlockTagCopyingItemTagProvider::new);
}
```

[damagetype]: damagetypes.md
[datacomponent]: ../../items/datacomponents.md
[datagen]: ../index.md#data-generation
[registry]: ../../concepts/registries.md
[regkey]: ../../misc/identifier.md#resourcekeys
[identifier]: ../../misc/identifier.md
