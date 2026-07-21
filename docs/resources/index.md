# 资源（Resources）

资源是游戏使用的外部文件，但它们不是代码。最常见的资源是纹理，不过 Minecraft 生态中还存在许多其他类型的资源。当然，所有这些资源都需要代码端的使用方，因此使用它们的系统也归入本节。

Minecraft 通常有两类资源：供[逻辑客户端][logicalsides]使用的资源称为 Asset，供[逻辑服务端][logicalsides]使用的资源称为 Data。Asset 主要是仅用于显示的信息，例如纹理、显示模型、翻译或声音；Data 则包括各种会影响玩法的内容，例如战利品表、配方或世界生成信息。它们分别从 Resource Pack 和 Data Pack 中加载。NeoForge 会为每个模组生成内置 Resource Pack 和 Data Pack。

Resource Pack 和 Data Pack 通常都需要一个 [`pack.mcmeta` 文件][packmcmeta]；不过，现代 NeoForge 会在运行时替你生成它，因此不必担心。

如果不清楚某项内容的格式，可以查看原版资源。NeoForge 开发环境不仅包含原版代码，也包含原版资源。在 IntelliJ 的 External Resources 区域或 Eclipse 的 Project Libraries 区域中，可以找到名为 `ng_dummy_ng.net.minecraft:client:client-extra:<minecraft_version>`（Minecraft 资源）或 `ng_dummy_ng.net.neoforged:neoforge:<neoforge_version>`（NeoForge 资源）的条目。

## Asset

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [Resource Pack][mcwikiresourcepacks]_

Asset（即客户端资源）是只与[客户端][sides]相关的所有资源。它们从 Resource Pack 加载；Resource Pack 有时也沿用旧称 Texture Pack（源于早期版本中它们只能影响纹理）。Resource Pack 本质上是一个 `assets` 文件夹。`assets` 文件夹包含 Resource Pack 所涉及各种命名空间的子文件夹，每个命名空间对应一个子文件夹。例如，模组 ID 为 `coolmod` 的 Resource Pack 很可能包含 `coolmod` 命名空间，但也可以额外包含 `minecraft` 等其他命名空间。

NeoForge 会自动把所有模组 Resource Pack 汇集到 `Mod resources` Pack 中，它位于 Resource Pack 菜单的 Selected Packs 一侧最底部。目前无法禁用 `Mod resources` Pack。不过，位于 `Mod resources` Pack 上方的 Resource Pack 会覆盖下方 Pack 中定义的资源。借助这一机制，Resource Pack 制作者可以覆盖模组资源，模组开发者也可以在需要时覆盖 Minecraft 资源。

Resource Pack 可包含影响以下内容的文件夹：

| 文件夹名称      | 内容                                |
|------------------|-----------------------------------------|
| `atlases`        | Texture Atlas Source（纹理图集来源）   |
| `blockstates`    | [Blockstate 文件][bsfile]              |
| `equipment`      | [Equipment 信息][equipment]             |
| `font`           | Font 定义                        |
| `items`          | [客户端 Item][citems]                  |
| `lang`           | [翻译文件][translations]       |
| `models`         | [模型][models]                        |
| `particles`      | [Particle 定义][particles]       |
| `post_effect`    | 后处理屏幕效果          |
| `shaders`        | Metadata、Fragment Shader 和 Vertex Shader |
| `sounds`         | [声音文件][sounds]                   |
| `texts`          | 其他文本文件                |
| `textures`       | [纹理][textures]                    |
| `waypoint_style` | Waypoint Icon Metadata（路径点图标 Metadata） |

## Data

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [Data Pack][mcwikidatapacks]_

与 Asset 相对，Data 指所有[服务端][sides]资源。与 Resource Pack 类似，Data 通过 Data Pack（也写作 Datapack）加载。和 Resource Pack 一样，Data Pack 由一个 [`pack.mcmeta` 文件][packmcmeta]和一个名为 `data` 的根文件夹组成。随后，同样与 Resource Pack 类似，`data` 文件夹包含 Data Pack 所涉及各种命名空间的子文件夹，每个命名空间对应一个子文件夹。例如，模组 ID 为 `coolmod` 的 Data Pack 很可能包含 `coolmod` 命名空间，但也可以额外包含 `minecraft` 等其他命名空间。

创建新世界时，NeoForge 会自动应用所有模组 Data Pack。目前无法禁用模组 Data Pack。不过，大多数 Data 文件可以由优先级更高的 Data Pack 覆盖（因而可用空文件替换来移除）。其他 Data Pack 可以放入世界的 `datapacks` 子文件夹，再通过 [`/datapack`][datapackcmd] 命令启用或禁用。

:::info
目前没有内置方式可以向每个世界应用一组自定义 Data Pack。不过，有许多模组可以实现这一点。
:::

Data Pack 可包含影响以下内容的文件夹：

| 文件夹名称                                                                                                               | 内容                     |
|---------------------------------------------------------------------------------------------------------------------------|------------------------------|
| `advancement`                                                                                                             | [成就（Advancement）][advancements] |
| `banner_pattern`                                                                                                          | Banner Pattern（旗帜图案）  |
| `cat_variant`, `chicken_variant`, `cow_variant`, `frog_variant`, `pig_variant`, `wolf_variant`, `zombie_nautilus_variant` | Entity Variant（Entity 变体） |
| `cat_sound_variant`, `chicken_sound_variant`, `cow_sound_variant`, `pig_sound_variant`, `wolf_sound_variant`              | Entity Sound Variant（Entity 声音变体） |
| `damage_type`                                                                                                             | [伤害类型（伤害类型）][damagetypes] |
| `datapacks`                                                                                                               | 内置 Data Pack           |
| `dialog`                                                                                                                  | Dialog Menu（对话菜单）     |
| `enchantment`, `enchantment_provider`                                                                                     | [Enchantment（附魔）][enchantment] |
| `instrument`, `jukebox_song`                                                                                              | 声音引用 Metadata     |
| `painting_variant`                                                                                                        | Painting（画）              |
| `loot_table`                                                                                                              | [战利品表（战利品表）][loottables] |
| `recipe`                                                                                                                  | [配方][recipes]           |
| `tags`                                                                                                                    | [Tag][tags]                 |
| `test_environment`, `test_instance`                                                                                       | [GameTest（游戏测试）][gmt] |
| `trade_set`, `villager_trade`                                                                                             | Villager Trade（村民交易）  |
| `trial_spawner`                                                                                                           | 战斗挑战            |
| `trim_material`, `trim_pattern`                                                                                           | 盔甲纹饰（Armor Trim）      |
| `neoforge/data_maps`                                                                                                      | [数据映射][datamap]         |
| `neoforge/loot_modifiers`                                                                                                 | [Global Loot Modifier（全局战利品修改器）][glm] |
| `dimension`, `dimension_type`, `structure`, `timeline`, `worldgen`, `neoforge/biome_modifier`                             | 世界生成文件               |

此外，它们还可包含一些与命令集成系统的子文件夹。这些系统很少与模组结合使用，但仍值得说明：

| 文件夹名称     | 内容                       |
|-----------------|--------------------------------|
| `chat_type`     | [Chat Type（聊天类型）][chattype] |
| `function`      | [函数（Function）][function]  |
| `item_modifier` | [Item Modifier（Item 修改器）][itemmodifier] |
| `predicate`     | [Predicate（谓词）][predicate] |

## `pack.mcmeta`

_另请参阅：[Minecraft Wiki][mcwiki] 上的 [`pack.mcmeta`（Resource Pack）][packmcmetaresourcepack]和 [`pack.mcmeta`（Data Pack）][packmcmetadatapack]_

[`pack.mcmeta` 文件][meta]保存 Resource Pack 或 Data Pack 的 Metadata。对于模组，NeoForge 会以合成方式生成 `pack.mcmeta`，因此该文件已不再必要。如果仍需要 `pack.mcmeta` 文件，可以在上面链接的 Minecraft Wiki 文章中找到完整规范。

## 数据生成

数据生成通常称为 Datagen，它是一种以编程方式生成 JSON 资源文件的方法，可以避免手工编写这些文件这一繁琐且容易出错的过程。这个名称略有误导，因为它既适用于 Asset，也适用于 Data。

Datagen 通过 Data 运行配置执行，该配置会与 Client 和 Server 运行配置一同生成。Data 运行配置会依照[模组生命周期][lifecycle]运行，直到 Registry Event 触发后。随后，它会触发某个 [`GatherDataEvent`][event]；你可以在其中以 Data Provider 形式注册待生成对象，系统会把这些对象写入磁盘，然后结束进程。

它有两个按[**物理端**][physicalside]运行的子类型：`GatherDataEvent.Client` 和 `GatherDataEvent.Server`。`GatherDataEvent.Client` 可以包含所有要生成的 Provider。另一方面，`GatherDataEvent.Server` 只能包含用于生成 Data Pack 条目的 Provider。

:::info
Provider 有两种推荐注册方式。第一种是全部注册到 `GatherDataEvent.Client`，并使用 `runClientData` 任务生成数据。第二种是把客户端 Provider 注册到 `GatherDataEvent.Client`，把服务端 Provider 注册到 `GatherDataEvent.Server`，再分别运行 `runClientData` 和 `runServerData` 任务生成它们。

由于 MDK 通过设置默认 `clientData` 配置采用第一种方案，下面所有示例也会使用第一种方案，将所有 Provider 注册到 `GatherDataEvent.Client`。
:::

所有 Data Provider 都扩展 `DataProvider` 接口，并且通常需要重写一个方法。下面列出了 Minecraft 和 NeoForge 提供的一些重要 Data Generator（链接文章中还包含 Helper 方法等更多信息）：

| 类                                                | 方法                           | 生成内容                                                               | 端   | 说明                                                                                                           |
|------------------------------------------------------|----------------------------------|-------------------------------------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------|
| [`ModelProvider`][modelprovider]                     | `registerModels()`               | 模型、Blockstate 文件、客户端 Item                                                             | Client |                                                                                                                 |
| [`LanguageProvider`][langprovider]                   | `addTranslations()`              | 翻译                                                            | Client | 还需要在构造器中传入语言。                                                          |
| [`EquipmentAssetProvider`][equipmentasset]           | `registerModels()`               | 盔甲模型的 Asset                                                 | Client |                                                                                                                 |
| [`ParticleDescriptionProvider`][particleprovider]    | `addDescriptions()`              | Particle 定义                                                    | Client |                                                                                                                 |
| [`SoundDefinitionsProvider`][soundprovider]          | `registerSounds()`               | 声音定义                                                       | Client |                                                                                                                 |
| `SpriteSourceProvider`                               | `gather()`                       | Sprite Source / Atlas                                                | Client |                                                                                                                 |
| [`AdvancementProvider`][advancementprovider]         | `generate()`                     | 成就                                                                   | Server | 需要额外的类才能正常工作，详见链接文章。                                                   |
| [`LootTableProvider`][loottableprovider]             | `generate()`                     | 战利品表                                                             | Server | 需要额外的方法和类才能正常工作，详见链接文章。                            |
| [`RecipeProvider`][recipeprovider]                   | `buildRecipes(RecipeOutput)`     | 配方                                                                 | Server | 需要额外的类才能正常工作，详见链接文章。                                                   |
| [`RecipePrioritiesProvider`][recipepriorities]       | `start()`                        | 配方优先级顺序                                              | Server |                                                                                                                 |
| [`TagsProvider` 的各种子类][tagsprovider] | `addTags(HolderLookup.Provider)` | Tag                                                                    | Server | 存在多个专用子类，详见链接文章。                                           |
| [`DataMapProvider`][datamapprovider]                 | `gather()`                       |数据映射条目                                                        | Server |                                                                                                                 |
| [`GlobalLootModifierProvider`][glmprovider]          | `start()`                        | Global Loot Modifier                                                   | Server |                                                                                                                 |
| [`DatapackBuiltinEntriesProvider`][datapackprovider] | N/A                              | Data Pack 内置条目，例如世界生成和 [伤害类型][damagetypes] | Server | 不重写方法，而是在构造器中的 Lambda 表达式内添加条目。详见链接文章。 |
| `JsonCodecProvider`（抽象类）                 | `gather()`                       | 带 Codec 的对象                                                    | Both   | 可以扩展该类，用于任何具有 [Codec]、可将数据编码的对象。                              |
| [`PackMetadataGenerator`][metagen]                   | `add(MetadataSectionType<T>, T)` | `pack.mcmeta`                                                           | Both |                                                                                                                 |

所有这些 Provider 都遵循同一种模式。首先创建子类并添加要生成的自定义资源，然后在[事件处理器][eventhandler]中把 Provider 添加到事件。以下是使用 `RecipeProvider` 的示例：

```java
public class MyRecipeProvider extends RecipeProvider {
    public MyRecipeProvider(HolderLookup.Provider registries, RecipeOutput output) {
        super(registries, output);
    }

    @Override
    protected void buildRecipes() {
        // Register your recipes here.
    }

    // The data provider class
    public static class Runner extends RecipeProvider.Runner {

        public Runner(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
            super(output, registries);
        }

        @Override
        protected RecipeProvider createRecipeProvider(HolderLookup.Provider registries, RecipeOutput output) {
            return new MyRecipeProvider(registries, output);
        }
    }
}

// In some event handler class
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    // Data providers should start by calling event.createDatapackRegistryObjects(...)
    // to register their datapack registry objects. This allows other providers
    // to use these objects during their own data generation.

    // From there, providers can generally be registered using event.createProvider(...),
    // which acts as a function that provides the PackOutput and optionally the
    // CompletableFuture<HolderLookup.Provider>.

    // Register the provider.
    event.createProvider(MyRecipeProvider.Runner::new);
    // Other data providers here.

    // If you want to create a datapack within the global pack, you can call
    // DataGenerator#getBuiltinDatapack. From there, you must use the
    // PackGenerator#addProvider method to add any providers to that pack.
    DataGenerator.PackGenerator examplePack = event.getGenerator().getBuiltinDatapack(
        true, // Should always be true.
        "examplemod", // The mod id.
        "example_pack" // The name of the pack.
    );
    
    examplePack.addProvider(output -> ...);
}
```

该事件提供了一些可供使用的 Helper 和上下文：

- `event.createDatapackRegistryObjects(...)` 使用给定的 `RegistrySetBuilder` 创建并注册 `DatapackBuiltinEntriesProvider`。它还会强制以后使用的任何 Lookup Provider 都包含由你生成的数据条目。
- `event.createProvider(...)` 通过 Lambda 表达式提供 `PackOutput` 以及可选的 `CompletableFuture<HolderLookup.Provider>`，从而注册 Provider。
- `event.createBlockAndItemTags(...)` 注册一个 `TagsProvider<Block>` 和一个 `TagsProvider<Item>`，其中 `TagsProvider<Item>` 使用 `TagsProvider<Block>` 构造。
- `event.getGenerator()` 返回要向其中注册 Provider 的 `DataGenerator`。
- `event.getPackOutput()` 返回某些 Provider 用于确定文件输出位置的 `PackOutput`。
- `event.getResourceManager(PackType)` 返回 `ResourceManager`，Provider 可以使用它检查已有文件。
- `event.getLookupProvider()` 返回 `CompletableFuture<HolderLookup.Provider>`，主要供 Tag 和 Datagen Registry 用来引用其他可能尚不存在的元素。
- `event.includeDev()` 和 `event.includeReports()` 是 `boolean` 方法，可用于检查是否启用了特定命令行参数（见下文）。

### 命令行参数

Data Generator 可接受多个命令行参数：

- `--mod examplemod`：让 Data Generator 为此模组执行 Datagen。NeoGradle 会自动为所属模组 ID 添加此参数；例如一个项目中有多个模组时，请添加该参数。
- `--output path/to/folder`：让 Data Generator 输出到指定文件夹。建议使用 Gradle 的 `file(...).getAbsolutePath()` 自动生成绝对路径（路径相对于项目根目录）。默认为 `file('src/generated/resources').getAbsolutePath()`。
- `--existing path/to/folder`：让 Data Generator 检查已有文件时考虑指定文件夹。与输出目录一样，建议使用 Gradle 的 `file(...).getAbsolutePath()`。
- `--existing-mod examplemod`：让 Data Generator 检查已有文件时考虑给定模组 JAR 文件中的资源。
- Generator Mode（以下均为 boolean 参数，不需要附加参数）：
    - `--includeDev`：是否运行开发工具。模组通常不应使用。可在运行时通过 `GatherDataEvent#includeDev()` 检查。
    - `--includeReports`：是否转储已注册对象的列表。可在运行时通过 `GatherDataEvent#includeReports()` 检查。
    - `--all`：启用所有 Generator Mode。

可以在 `build.gradle` 中添加以下内容，将所有参数加入运行配置：

```groovy
runs {
    // other run configurations here

    clientData {
        arguments.addAll '--arg1', 'value1', '--arg2', 'value2', '--all' // boolean args have no value
    }
}
```

例如，要复现默认参数，可以指定以下内容：

```groovy
runs {
    // other run configurations here

    clientData {
        arguments.addAll '--mod', 'examplemod', // insert your own mod id
                '--output', file('src/generated/resources').getAbsolutePath(),
                '--all'
    }
}
```

[advancementprovider]: server/advancements.md#数据生成
[advancements]: server/advancements.md
[bsfile]: client/models/index.md#blockstate-files
[chattype]: https://minecraft.wiki/w/Chat_type
[citems]: client/models/items.md
[codec]: ../datastorage/codecs.md
[damagetypes]: server/damagetypes.md
[datamap]: server/datamaps/index.md
[datamapprovider]: server/datamaps/index.md#data-generation
[datapackcmd]: https://minecraft.wiki/w/Commands/datapack
[datapackprovider]: ../concepts/registries.md#data-generation-for-datapack-registries
[enchantment]: server/enchantments/index.md
[equipment]: ../items/armor.md#equipment-models
[equipmentasset]: ../items/armor.md#equipment-assets
[event]: ../concepts/events.md
[eventhandler]: ../concepts/events.md#注册事件处理器
[function]: https://minecraft.wiki/w/Function_(Java_Edition)
[glm]: server/loottables/glm.md
[glmprovider]: server/loottables/glm.md#datagen
[gmt]: ../misc/gametest.md
[itemmodifier]: https://minecraft.wiki/w/Item_modifier
[langprovider]: client/i18n.md#datagen
[lifecycle]: ../concepts/events.md#the-mod-lifecycle
[logicalsides]: ../concepts/sides.md#the-logical-side
[loottableprovider]: server/loottables/index.md#datagen
[loottables]: server/loottables/index.md
[mcwiki]: https://minecraft.wiki
[mcwikidatapacks]: https://minecraft.wiki/w/Data_pack
[mcwikiresourcepacks]: https://minecraft.wiki/w/Resource_pack
[meta]: metadata.md
[metagen]: metadata.md#packmetadatagenerator
[modelprovider]: client/models/datagen.md
[models]: client/models/index.md
[packmcmeta]: #packmcmeta
[packmcmetadatapack]: https://minecraft.wiki/w/Data_pack#pack.mcmeta
[packmcmetaresourcepack]: https://minecraft.wiki/w/Resource_pack#Contents
[particleprovider]: client/particles.md#datagen
[particles]: client/particles.md
[physicalside]: ../concepts/sides.md#the-physical-side
[predicate]: https://minecraft.wiki/w/Predicate
[recipeprovider]: server/recipes/index.md#data-generation
[recipes]: server/recipes/index.md
[recipepriorities]: server/recipes/index.md#recipe-priorities
[sides]: ../concepts/sides.md
[soundprovider]: client/sounds.md#datagen
[sounds]: client/sounds.md
[tags]: server/tags.md
[tagsprovider]: server/tags.md#datagen
[textures]: client/textures.md
[translations]: client/i18n.md#language-files
