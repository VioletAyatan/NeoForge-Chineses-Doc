# 注册表（Registry）

注册是将模组中的对象（例如 [Item][item]、[Block][block]、Entity 等）告知游戏的过程。注册非常重要，因为如果不注册，游戏根本不会知道这些对象的存在，从而引发难以解释的行为和崩溃。

简单来说，registry 是一个对 map 的封装，它把 registry name（见下文）映射到已注册对象，后者通常称为 registry entry。Registry name 在同一个 registry 内必须唯一，但同一个 registry name 可以存在于多个 registry 中。最常见的例子是 Block（位于 `BLOCKS` registry 中）拥有相同 registry name 的 Item 形式（位于 `ITEMS` registry 中）。

每个已注册对象都有一个唯一名称，称为 registry name。该名称以 [`Identifier`][identifier] 表示。例如，泥土 Block 的 registry name 是 `minecraft:dirt`，僵尸的 registry name 是 `minecraft:zombie`。模组对象当然不会使用 `minecraft` namespace，而会改用其 mod id。

## 原版 VS 模组

为理解 NeoForge registry 系统中的一些设计决策，我们先看看 Minecraft 是如何处理注册的。这里使用 Block registry 作为示例，因为大多数其他 registry 的工作方式相同。

Registry 通常注册[单例][singleton]。这意味着每个 registry entry 只存在一个实例。例如，你在整个游戏中看到的所有石头 Block，实际上都是同一个石头 Block 被显示了许多次。需要石头 Block 时，可以引用已注册的 Block 实例来获取它。

Minecraft 在 `Blocks` class 中注册所有 Block。通过 `register` 方法调用 `Registry#register()`，其第一个参数是位于 `BuiltInRegistries.BLOCK` 的 Block registry。注册完所有 Block 后，Minecraft 会基于 Block 列表执行各种检查，例如验证所有 Block 是否都加载了 model 的自检。

这一切能够正常工作的主要原因，是 Minecraft 足够早地加载了 `Blocks` class。Minecraft 不会自动加载模组的 class，因此需要变通方案。

## 注册方法

NeoForge 提供两种对象注册方式：`DeferredRegister` class 与 `RegisterEvent`。前者是对后者的封装，推荐使用前者以避免错误。

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

然后可以使用以下方法之一，将 registry entry 添加为 static final field（有关 `new Block()` 应添加哪些参数，请参阅 [Block 一文][block]）：

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

`DeferredHolder<R, T extends R>` class 持有我们的对象。类型参数 `R` 是正在注册到的 registry 的类型（本例为 `Block`）。类型参数 `T` 是 supplier 的类型。由于第一个示例直接注册 `Block`，因此提供 `Block` 作为第二个参数。如果注册的是 `Block` 的 subclass 对象，例如 `SlabBlock`（如第二个示例所示），则应在此提供 `SlabBlock`。

`DeferredHolder<R, T extends R>` 是 `Supplier<T>` 的 subclass。需要已注册对象时，可以调用 `DeferredHolder#get()`。因为 `DeferredHolder` 扩展了 `Supplier`，还可以将 `Supplier` 用作 field 的类型。这样，上面的代码就变成：

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

:::note
请注意，少数位置明确要求 `Holder` 或 `DeferredHolder`，而不接受任意 `Supplier`。如果需要这两种类型之一，最好按需要把 `Supplier` 类型改回 `Holder` 或 `DeferredHolder`。
:::

最后，由于整个系统是对 registry Event 的封装，我们需要告诉 `DeferredRegister` 按需将自身挂接到 registry Event：

```java
//This is our mod constructor
public ExampleMod(IEventBus modBus) {
    //highlight-next-line
    ExampleBlocksClass.BLOCKS.register(modBus);
    //Other stuff here
}
```

:::info
针对 Block、Item、data component 和 Entity，`DeferredRegister` 分别提供了带有辅助方法的专用变体：[`DeferredRegister.Blocks`][defregblocks]、[`DeferredRegister.Items`][defregitems]、[`DeferredRegister.DataComponents`][defregcomp] 和 [`DeferredRegister.Entities`][defregentity]。
:::

### `RegisterEvent`

`RegisterEvent` 是注册对象的第二种方式。该 [Event][event] 会针对每个 registry 触发，时间是在 mod constructor 之后（因为 `DeferredRegister` 会在其中注册内部 Event handler）、配置加载之前。`RegisterEvent` 在 mod event bus 上触发。

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

## 查询 Registry

有时你需要按给定 id 获取已注册对象，或获取某个已注册对象的 id。Registry 本质上是从 id（`Identifier`）到不同对象的 map，也就是可逆 map，因此这两种操作都可实现：

```java
BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("minecraft", "dirt")); // returns the dirt block
BuiltInRegistries.BLOCK.getKey(Blocks.DIRT); // returns the resource location "minecraft:dirt"

// Assume that ExampleBlocksClass.EXAMPLE_BLOCK.get() is a Supplier<Block> with the id "yourmodid:example_block"
BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("yourmodid", "example_block")); // returns the example block
BuiltInRegistries.BLOCK.getKey(ExampleBlocksClass.EXAMPLE_BLOCK.get()); // returns the resource location "yourmodid:example_block"
```

如果只想检查对象是否存在，也可以做到，不过只能使用 key：

```java
BuiltInRegistries.BLOCK.containsKey(Identifier.fromNamespaceAndPath("minecraft", "dirt")); // true
BuiltInRegistries.BLOCK.containsKey(Identifier.fromNamespaceAndPath("create", "brass_ingot")); // true only if Create is installed
```

正如最后一个示例所示，可以对任意 mod id 执行此操作，因此这是检查其他模组中的某个 Item 是否存在的绝佳方法。

最后，还可以迭代 registry 中的所有 entry，既可以遍历 key，也可以遍历 entry（entry 使用 Java 的 `Map.Entry` 类型）：

```java
for (Identifier id : BuiltInRegistries.BLOCK.keySet()) {
    // ...
}
for (Map.Entry<ResourceKey<Block>, Block> entry : BuiltInRegistries.BLOCK.entrySet()) {
    // ...
}
```

:::note
查询操作始终使用 Vanilla `Registry`，而不是 `DeferredRegister`。这是因为 `DeferredRegister` 只是注册工具。
:::

:::danger
查询操作只有在注册完成后才是安全的。**注册仍在进行时，切勿查询 REGISTRY！**
:::

## 自定义 Registry

自定义 registry 允许你指定额外系统，供你的模组的附加模组接入。例如，如果你的模组添加了法术，可以把法术做成 registry，从而允许其他模组向你的模组添加法术，而你无需进行额外处理。它还允许你自动完成同步 entry 等操作。

首先创建 [registry key][resourcekey] 和 registry 本身：

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

然后在 `NewRegistryEvent` 中将 registry 注册到根 registry，以告知游戏该 registry 的存在：

```java
@SubscribeEvent // on the mod event bus
public static void registerRegistries(NewRegistryEvent event) {
    event.register(SPELL_REGISTRY);
}
```

现在可以像处理其他 registry 一样，通过 `DeferredRegister` 和 `RegisterEvent` 注册新的 registry 内容：

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

## Datapack Registry

Datapack registry（也称 dynamic registry，或按其主要用途称为 worldgen registry）是一种特殊 registry：它在加载世界时从 [datapack][datapack] JSON 加载数据（名称由此而来），而不是在游戏启动时加载。默认 datapack registry 中最典型的是大多数 worldgen registry，此外还有少数其他 registry。

Datapack registry 允许通过 JSON 文件指定其内容。这意味着不需要任何代码（如果不想手写 JSON 文件，则只需要 [datagen][datagen]）。每个 datapack registry 都关联一个用于序列化的 [`Codec`][codec]，而各 registry 的 id 决定其 datapack 路径：

- Minecraft 的 datapack registry 使用 `data/yourmodid/registrypath` 格式（例如 `data/yourmodid/worldgen/biome`，其中 `worldgen/biome` 是 registry path）。
- 所有其他 datapack registry（NeoForge 或模组提供）使用 `data/yourmodid/registrynamespace/registrypath` 格式（例如 `data/yourmodid/neoforge/biome_modifier`，其中 `neoforge` 是 registry namespace，`biome_modifier` 是 registry path）。

可以从 `RegistryAccess` 获取 datapack registry。在服务端可调用 `ServerLevel#registryAccess()` 获取该 `RegistryAccess`，在客户端则可调用 `Minecraft.getInstance().getConnection()#registryAccess()`（后者只在确实已连接到世界时有效，否则 connection 为 null）。这些调用的结果可像其他 registry 一样使用，以获取特定元素或迭代内容。

### 自定义 Datapack Registry

自定义 datapack registry 不要求构造 `Registry`。它只需要一个 registry key，以及至少一个用于对内容进行序列化与反序列化的 [`Codec`][codec]。继续使用前面的法术示例，将法术 registry 注册为 datapack registry 大致如下：

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

### 为 Datapack Registry 生成数据

手写所有 JSON 文件既繁琐又容易出错，因此 NeoForge 提供了一个[数据 provider][datagenindex] 来代你生成 JSON 文件。它既适用于内置 datapack registry，也适用于你自己的 datapack registry。

首先创建 `RegistrySetBuilder` 并向其中添加 entry（一个 `RegistrySetBuilder` 可容纳多个 registry 的 entry）：

```java
new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        // Register configured features through the bootstrap context (see below)
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        // Register placed features through the bootstrap context (see below)
    });
```

我们实际使用 `bootstrap` lambda 参数注册对象。它的类型是 `BootstrapContext`。要注册对象，可对其调用 `#register`，如下所示：

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

如有需要，`BootstrapContext` 还可用于查找其他 registry 中的 entry：

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

最后，在实际的数据 provider 中使用 `RegistrySetBuilder`，并将该数据 provider 注册到 Event：

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
[blockentity]: ../blockentities/index.md
[codec]: ../datastorage/codecs.md
[datagen]: #data-generation-for-datapack-registries
[datagenindex]: ../resources/index.md#data-generation
[datapack]: ../resources/index.md#data
[defregblocks]: ../blocks/index.md#deferredregisterblocks-helpers
[defregcomp]: ../items/datacomponents.md#creating-custom-data-components
[defregentity]: ../entities/index.md#entitytype
[defregitems]: ../items/index.md#deferredregisteritems
[event]: events.md
[item]: ../items/index.md
[identifier]: ../misc/identifier.md
[resourcekey]: ../misc/identifier.md#resourcekeys
[singleton]: https://en.wikipedia.org/wiki/Singleton_pattern
