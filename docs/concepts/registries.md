# 注册表（Registries）

注册是将模组中的对象（例如 [物品][item]、[方块][block]、实体等）告知游戏的过程。注册非常重要，因为如果不注册，游戏根本不会知道这些对象的存在，从而引发难以解释的行为和崩溃。

简单来说，注册表（registry）是对映射关系的封装：它将注册名（registry name，见下文）映射到已注册对象，这些对象称为注册项（registry entry）。注册名在同一个注册表内必须唯一，但相同的注册名可以分别存在于不同注册表中。最常见的例子是：方块注册表 `BLOCKS` 中的方块，可以与物品注册表 `ITEMS` 中对应的物品使用相同的注册名。

每个注册项都有一个唯一名称，称为注册名。注册名以[标识符（Identifier）][identifier]表示。例如，泥土方块的注册名是 `minecraft:dirt`，僵尸的注册名是 `minecraft:zombie`。模组对象通常不会使用 `minecraft` 命名空间，而会使用自身的模组 ID。

## 原版与模组

为了理解 NeoForge 注册表系统中的一些设计决策，我们先看看 Minecraft 是如何处理注册的。这里以方块注册表为例，因为大多数其他注册表的工作方式相同。

注册表中的对象通常以[单例][singleton]形式存在。这意味着每个注册项只有一个实例。例如，游戏中所有石头方块都引用同一个已注册的石头方块实例；需要石头方块时，直接获取并引用该实例即可。

Minecraft 在 `Blocks` 类中注册所有方块。其 `register` 方法会调用 `Registry#register()`，第一个参数是 `BuiltInRegistries.BLOCK` 中的方块注册表。注册完所有方块后，Minecraft 会基于方块列表执行各种检查，例如验证所有方块是否都已加载模型。

这一切能够正常工作的主要原因，是 Minecraft 足够早地加载了 `Blocks` 类。Minecraft 不会自动加载模组的类，因此需要变通方案。

## 注册方法

NeoForge 提供两种对象注册方式：`DeferredRegister` 类与 `RegisterEvent`。前者是对后者的封装，推荐使用前者以避免错误。

### `DeferredRegister`

首先创建 `DeferredRegister`：

```java
public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(
        // The registry we want to use.
        // Minecraft's registries can be found in BuiltInRegistries, NeoForge's registries can be found in NeoForgeRegistries.
        // Mods may also add their own registries, refer to the individual mod's documentation or source code for where to find them.
        BuiltInRegistries.BLOCK,
        // Our mod id.
        ExampleMod.MOD_ID
);
```

然后可以使用以下方法之一，将 registry entry 添加为 `static final` 字段（有关 `new Block()` 应添加哪些参数，请参阅 [Block][block] 一文）：

```java
public static final DeferredHolder<Block, Block> EXAMPLE_BLOCK_1 = BLOCKS.register(
        // Our registry name.
        "example_block",
        // A supplier of the object we want to register.
        () -> new Block(...)
);

public static final DeferredHolder<Block, SlabBlock> EXAMPLE_BLOCK_2 = BLOCKS.register(
        // Our registry name.
        "example_block",
        // A function creating the object we want to register
        // given its registry name as a Identifier.
        registryName -> new SlabBlock(...)
);
```

`DeferredHolder<R, T extends R>` 用于持有已注册对象。类型参数 `R` 表示目标注册表所存储的基础类型（本例为 `Block`），类型参数 `T` 表示当前注册项的具体类型。第一个示例直接注册 `Block`，因此第二个类型参数也是 `Block`；第二个示例注册的是 `Block` 的子类 `SlabBlock`，因此第二个类型参数应为 `SlabBlock`。

`DeferredHolder<R, T extends R>` 实现了 `Supplier<T>` 接口。需要获取已注册对象时，可以调用 `DeferredHolder#get()`。因此，也可以将字段类型声明为 `Supplier`，上述代码可改写为：

```java
public static final Supplier<Block> EXAMPLE_BLOCK_1 = BLOCKS.register(
        // Our registry name.
        "example_block",
        // A supplier of the object we want to register.
        () -> new Block(...)
);

public static final Supplier<SlabBlock> EXAMPLE_BLOCK_2 = BLOCKS.register(
        // Our registry name.
        "example_block",
        // A function creating the object we want to register
        // given its registry name as a Identifier.
        registryName -> new SlabBlock(...)
);
```

:::info
请注意，少数位置明确要求 `Holder` 或 `DeferredHolder`，而不接受任意 `Supplier`。如果需要这两种类型之一，最好按需要把 `Supplier` 类型改回 `Holder` 或 `DeferredHolder`。
:::

最后，由于整个系统是对注册表事件的封装，需要让 `DeferredRegister` 按需将自身挂接到这些注册表事件上：

```java
//This is our mod constructor
public ExampleMod(IEventBus modBus) {
    //highlight-next-line
    ExampleBlocksClass.BLOCKS.register(modBus);
    //Other stuff here
}
```

:::info
针对方块、物品、数据组件和实体，`DeferredRegister` 分别提供了带有辅助方法的专用变体：[`DeferredRegister.Blocks`][defregblocks]、[`DeferredRegister.Items`][defregitems]、[`DeferredRegister.DataComponents`][defregcomp] 和 [`DeferredRegister.Entities`][defregentity]。
:::

### `RegisterEvent`

`RegisterEvent` 是注册对象的第二种方式。该[事件][event]会针对每个注册表触发，触发时间位于模组构造器执行之后、配置加载之前（这是因为 `DeferredRegister` 会在模组构造器中注册其内部事件处理器）。`RegisterEvent` 在模组事件总线上触发。

```java
@SubscribeEvent // on the mod event bus
public static void register(RegisterEvent event) {
    event.register(
            // This is the registry key of the registry.
            // Get these from BuiltInRegistries for vanilla registries,
            // or from NeoForgeRegistries.Keys for NeoForge registries.
            BuiltInRegistries.BLOCK,
            // Register your objects here.
            registry -> {
                registry.register(Identifier.fromNamespaceAndPath(MODID, "example_block_1"), new Block(...));
                registry.register(Identifier.fromNamespaceAndPath(MODID, "example_block_2"), new Block(...));
                registry.register(Identifier.fromNamespaceAndPath(MODID, "example_block_3"), new Block(...));
            }
    );
}
```

## 查询注册表

有时需要根据给定 ID 获取注册项，或根据某个注册项查询其 ID。注册表本质上维护着从 ID（`Identifier`）到不同对象的映射，并支持反向查询，因此这两种操作都可以实现：

```java
BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("minecraft", "dirt")); // returns the dirt block
BuiltInRegistries.BLOCK.getKey(Blocks.DIRT); // returns the resource location "minecraft:dirt"

// Assume that ExampleBlocksClass.EXAMPLE_BLOCK.get() is a Supplier<Block> with the id "yourmodid:example_block"
BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("yourmodid", "example_block")); // returns the example block
BuiltInRegistries.BLOCK.getKey(ExampleBlocksClass.EXAMPLE_BLOCK.get()); // returns the resource location "yourmodid:example_block"
```

如果只想检查某个注册项是否存在，也可以做到，不过只能通过键进行判断：

```java
BuiltInRegistries.BLOCK.containsKey(Identifier.fromNamespaceAndPath("minecraft", "dirt")); // true
BuiltInRegistries.BLOCK.containsKey(Identifier.fromNamespaceAndPath("create", "brass_ingot")); // true only if Create is installed
```

正如最后一个示例所示，可以对任意模组 ID 执行此操作，因此这非常适合用于检查其他模组中的某个物品是否存在。

最后，还可以遍历注册表中的全部内容：既可以遍历键，也可以遍历键值对（后者使用 Java 的 `Map.Entry` 类型）：

```java
for (Identifier id : BuiltInRegistries.BLOCK.keySet()) {
    // ...
}
for (Map.Entry<ResourceKey<Block>, Block> entry : BuiltInRegistries.BLOCK.entrySet()) {
    // ...
}
```

:::info
查询操作始终使用原版 `Registry`，而不是 `DeferredRegister`。这是因为 `DeferredRegister` 只是注册工具。
:::

:::danger
查询操作只有在注册完成后才是安全的。**注册仍在进行时，切勿查询注册表！**
:::

## 自定义注册表

自定义注册表允许你的模组定义可供附属模组接入的扩展系统。例如，如果你的模组添加了法术，可以将法术作为一种注册表，从而允许其他模组向该注册表添加法术，而无需由你的模组进行额外处理。自定义注册表还可以自动处理注册项同步等工作。

首先创建[注册表键（registry key）][resourcekey]和注册表本身：

```java
// We use spells as an example for the registry here, without any details about what a spell actually is (as it doesn't matter).
// Of course, all mentions of spells can and should be replaced with whatever your registry actually is.
public static final ResourceKey<Registry<Spell>> SPELL_REGISTRY_KEY = ResourceKey.createRegistryKey(Identifier.fromNamespaceAndPath("yourmodid", "spells"));
public static final Registry<YourRegistryContents> SPELL_REGISTRY = new RegistryBuilder<>(SPELL_REGISTRY_KEY)
        // If you want to enable integer id syncing, for networking.
        // These should only be used in networking contexts, for example in packets or purely networking-related NBT data.
        .sync(true)
        // The default key. Similar to minecraft:air for blocks. This is optional.
        .defaultKey(Identifier.fromNamespaceAndPath("yourmodid", "empty"))
        // Effectively limits the max count. Generally discouraged, but may make sense in settings such as networking.
        .maxId(256)
        // Build the registry.
        .create();
```

然后在 `NewRegistryEvent` 中将该 Registry 注册到根 Registry，以告知游戏该注册表的存在：

```java
@SubscribeEvent // on the mod event bus
public static void registerRegistries(NewRegistryEvent event) {
    event.register(SPELL_REGISTRY);
}
```

现在可以像处理其他注册表一样，通过 `DeferredRegister` 或 `RegisterEvent` 向该注册表添加注册项：

```java
public static final DeferredRegister<Spell> SPELLS = DeferredRegister.create(SPELL_REGISTRY, "yourmodid");
public static final Supplier<Spell> EXAMPLE_SPELL = SPELLS.register("example_spell", () -> new Spell(...));

// Alternatively:
@SubscribeEvent // on the mod event bus
public static void register(RegisterEvent event) {
    event.register(SPELL_REGISTRY_KEY, registry -> {
        registry.register(Identifier.fromNamespaceAndPath("yourmodid", "example_spell"), () -> new Spell(...));
    });
}
```

## 数据包注册表（Datapack Registry）

数据包注册表（datapack registry）也称为动态注册表（dynamic registry）；由于其主要用于世界生成，也常称为世界生成注册表（worldgen registry）。它是一种特殊注册表：在加载世界时从[数据包][datapack]的 JSON 文件中加载数据，而不是在游戏启动时加载。默认提供的数据包注册表中，最常见的是各类世界生成注册表，此外还有少量其他注册表。

数据包注册表允许通过 JSON 文件指定其内容。这意味着无需编写代码；如果不想手写 JSON 文件，只需使用[数据生成（datagen）][datagen]即可。每个数据包注册表都关联一个用于序列化的 [`Codec`][codec]，而注册表的 ID 决定其数据包路径：

- Minecraft 提供的数据包注册表使用 `data/yourmodid/registrypath` 格式（例如 `data/yourmodid/worldgen/biome`，其中 `worldgen/biome` 是注册表路径）。
- 其他数据包注册表（由 NeoForge 或模组提供）使用 `data/yourmodid/registrynamespace/registrypath` 格式（例如 `data/yourmodid/neoforge/biome_modifier`，其中 `neoforge` 是注册表命名空间，`biome_modifier` 是注册表路径）。

可以通过 `RegistryAccess` 访问数据包注册表。在服务端，可调用 `ServerLevel#registryAccess()` 获取 `RegistryAccess`；在客户端，可调用 `Minecraft.getInstance().getConnection()#registryAccess()`，但该调用仅在客户端确实已连接到世界时有效，否则连接对象为 `null`。取得 `RegistryAccess` 后，可以像操作其他注册表一样查询特定注册项或遍历其内容。

### 自定义数据包注册表

自定义数据包注册表不需要显式构造 `Registry`，只需要一个注册表键，以及至少一个用于对注册表内容进行序列化与反序列化的 [`Codec`][codec]。继续使用前面的法术示例，将法术注册表定义为数据包注册表的方式大致如下：

```java
public static final ResourceKey<Registry<Spell>> SPELL_REGISTRY_KEY = ResourceKey.createRegistryKey(Identifier.fromNamespaceAndPath("yourmodid", "spells"));

@SubscribeEvent // on the mod event bus
public static void registerDatapackRegistries(DataPackRegistryEvent.NewRegistry event) {
    event.dataPackRegistry(
            // The registry key.
            SPELL_REGISTRY_KEY,
            // The codec of the registry contents.
            Spell.CODEC,
            // The network codec of the registry contents. Often identical to the normal codec.
            // May be a reduced variant of the normal codec that omits data that is not needed on the client.
            // May be null. If null, registry entries will not be synced to the client at all.
            // May be omitted, which is functionally identical to passing null (a method overload
            // with two parameters is called that passes null to the normal three parameter method).
            Spell.CODEC,
            // A consumer which configures the constructed registry via the RegistryBuilder.
            // May be omitted, which is functionally identical to passing builder -> {}.
            builder -> builder.maxId(256)
    );
}
```

### 为数据包注册表生成数据

手写所有 JSON 文件既繁琐又容易出错，因此 NeoForge 提供了一个[数据提供器][datagenindex]来代为生成 JSON 文件。它既适用于内置数据包注册表，也适用于自定义数据包注册表。

首先创建 `RegistrySetBuilder`，并向其中添加注册项（一个 `RegistrySetBuilder` 可以容纳多个注册表的注册项）：

```java
new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        // Register configured features through the bootstrap context (see below)
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        // Register placed features through the bootstrap context (see below)
    });
```

实际注册对象时使用的是 `bootstrap` Lambda 参数，其类型为 `BootstrapContext`。要注册对象，可调用它的 `#register` 方法，如下所示：

```java
// The resource key of our object.
public static final ResourceKey<ConfiguredFeature<?, ?>> EXAMPLE_CONFIGURED_FEATURE = ResourceKey.create(
    Registries.CONFIGURED_FEATURE,
    Identifier.fromNamespaceAndPath(MOD_ID, "example_configured_feature")
);

new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        bootstrap.register(
            // The resource key of our configured feature.
            EXAMPLE_CONFIGURED_FEATURE,
            // The actual configured feature.
            new ConfiguredFeature<>(Feature.ORE, new OreConfiguration(...))
        );
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        // ...
    });
```

如有需要，`BootstrapContext` 还可用于查找其他注册表中的注册项：

```java
public static final ResourceKey<ConfiguredFeature<?, ?>> EXAMPLE_CONFIGURED_FEATURE = ResourceKey.create(
    Registries.CONFIGURED_FEATURE,
    Identifier.fromNamespaceAndPath(MOD_ID, "example_configured_feature")
);
public static final ResourceKey<PlacedFeature> EXAMPLE_PLACED_FEATURE = ResourceKey.create(
    Registries.PLACED_FEATURE,
    Identifier.fromNamespaceAndPath(MOD_ID, "example_placed_feature")
);

new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        bootstrap.register(EXAMPLE_CONFIGURED_FEATURE, ...);
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        HolderGetter<ConfiguredFeature<?, ?>> otherRegistry = bootstrap.lookup(Registries.CONFIGURED_FEATURE);
        bootstrap.register(EXAMPLE_PLACED_FEATURE, new PlacedFeature(
            otherRegistry.getOrThrow(EXAMPLE_CONFIGURED_FEATURE), // Get the configured feature
            List.of() // No-op when placement happens - replace with whatever your placement parameters are
        ));
    });
```

最后，在实际的数据提供器中使用 `RegistrySetBuilder`，并将该数据提供器注册到事件：

```java
@SubscribeEvent // on the mod event bus
public static void onGatherData(GatherDataEvent.Client event) {
    // Adds the generated registry objects to the current lookup provider for use
    // in other datagen.
    event.createDatapackRegistryObjects(
        // Our registry set builder to generate the data from.
        new RegistrySetBuilder().add(...),
        // (Optional) A biconsumer that takes in any conditions to load the object
        // associated with the resource key
        conditions -> {
            conditions.accept(resourceKey, condition);
        },
        // (Optional) A set of mod ids we are generating the entries for
        // By default, supplies the mod id of the current mod container.
        Set.of("yourmodid")
    );

    // You can use the lookup provider with your generated entries by either calling one
    // of the `#create*` methods or grabbing the actual lookup via `#getLookupProvider`
    // ...
}
```

[block]: ../blocks/index.md
[codec]: ../datastorage/codecs.md
[datagen]: #data-generation-for-datapack-registries
[datagenindex]: ../resources/index.md#data-generation
[datapack]: ../resources/index.md#data
[defregblocks]: ../blocks/index.md#deferredregisterblocks-helpers
[defregcomp]: ../items/datacomponents.md#创建自定义数据组件
[defregentity]: ../entities/index.md#entitytype
[defregitems]: ../items/index.md#deferredregisteritems
[event]: events.md
[item]: ../items/index.md
[identifier]: ../misc/identifier.md
[resourcekey]: ../misc/identifier.md#resourcekeys
[singleton]: https://en.wikipedia.org/wiki/Singleton_pattern
