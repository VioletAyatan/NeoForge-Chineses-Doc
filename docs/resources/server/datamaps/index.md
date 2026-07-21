# 数据映射（Data Map）

Data Map 包含由数据驱动、可重新加载，并可附加到已注册对象上的对象。该系统提供同步、冲突解决等功能，让游戏行为更容易由数据驱动，从而带来更好且更具可配置性的用户体验。可以把[标签][tags]理解为“Registry 对象 ➜ 布尔值”的映射，而 Data Map 则是更加灵活的“Registry 对象 ➜ 对象”映射。与[标签][tags]类似，Data Map 会向对应的 Data Map 中追加内容，而不是覆盖它。

Data Map 既可以附加到静态内置 Registry，也可以附加到动态、由数据驱动的数据包 Registry。Data Map 支持通过 `/reload` 命令或任何其他会重新加载服务器资源的方式进行重载。

NeoForge 针对常见用例提供了多种[内置 Data Map][builtin]，用于取代原版中硬编码的字段。更多信息请参阅所链接的文章。

## 文件位置

Data Map 从位于 `<mapNamespace>/data_maps/<registryNamespace>/<registryPath>/<mapPath>.json` 的 JSON 文件加载，其中：

- `<mapNamespace>` 是 Data Map ID 的命名空间；
- `<mapPath>` 是 Data Map ID 的路径；
- `<registryNamespace>` 是 Registry ID 的命名空间（如果是 `minecraft` 则省略）；
- `<registryPath>` 是 Registry ID 的路径。

示例：

- 对于 `minecraft:item` Registry 中名为 `mymod:drop_healing` 的 Data Map（如下方示例），路径是 `mymod/data_maps/item/drop_healing.json`。
- 对于 `minecraft:block` Registry 中名为 `somemod:somemap` 的 Data Map，路径是 `somemod/data_maps/block/somemap.json`。
- 对于 `somemod:custom` Registry 中名为 `example:stuff` 的 Data Map，路径是 `example/data_maps/somemod/custom/stuff.json`。

## JSON 结构

Data Map 文件本身可以包含以下字段：

- `replace`：布尔值；添加此文件的值之前先清空 Data Map。mod 绝不应随附此字段，它只应由需要按照自身需求覆盖此 Map 的数据包开发者使用。
- `neoforge:conditions`：[加载条件][conditions]列表。
- `values`：从 Registry ID 或标签 ID 映射到相应值的 Map；这些值应由你的 mod 添加到 Data Map。值本身的结构由 Data Map 的 codec 定义（见下文）。
- `remove`：要从 Data Map 中移除的 Registry ID 或标签 ID 列表。

### 添加值

例如，假设 `minecraft:item` Registry 有一个 Data Map 对象，其中包含两个 float 键 `amount` 和 `chance`。对应的 Data Map 文件大致如下：

```json5
{
    "values": {
        // Attach a value to the carrot item
        "minecraft:carrot": {
            "amount": 12,
            "chance": 1
        },
        // Attach a value to all items in the logs tag
        "#minecraft:logs": {
            "amount": 1,
            "chance": 0.1
        }
    }
}
```

Data Map 可以支持[合并器][mergers]；发生冲突时，例如两个 mod 为同一个 Item 添加 Data Map 值时，合并器会执行自定义合并行为。若要避免触发合并器，可以在元素层级指定 `replace` 字段：

```json5
{
    "values": {
        // Overwrite the value of the carrot item
        "minecraft:carrot": {
            // highlight-next-line
            "replace": true,
            // The new value will be under a value sub-object
            "value": {
                "amount": 12,
                "chance": 1
            }
        }
    }
}
```

### 移除现有值

可以通过指定要移除的 Item ID 或标签 ID 列表来移除元素：

```json5
{
    // We do not want the potato to have a value, even if another mod's data map added it
    "remove": [
        "minecraft:potato"
    ]
}
```

移除操作在添加操作之后运行，因此可以先包含一个标签，再从中排除某些元素：

```json5
{
    "values": {
        "#minecraft:logs": { /* ... */ }
    },
    // Exclude crimson stem again
    "remove": [
        "minecraft:crimson_stem"
    ]
}
```

Data Map 可以支持带附加参数的自定义[移除器][removers]。要提供这些参数，可以将 `remove` 列表改为一个 JSON 对象：其中待移除元素作为 Map 键，附加数据作为对应的值。例如，假设移除器对象被序列化为字符串，则移除器 Map 大致如下：

```json5
{
    "remove": {
        // The remover will be deserialized from the value (`somekey1` in this case)
        // and applied to the value attached to the carrot item
        "minecraft:carrot": "somekey1"
    }
}
```

## 自定义 Data Map

首先定义 Data Map 条目的格式。**Data Map 条目必须不可变**，因此 record 非常适合。继续使用上面包含两个 float 值 `amount` 和 `chance` 的示例，Data Map 条目大致如下：

```java
public record ExampleData(float amount, float chance) {}
```

与许多其他内容一样，Data Map 使用 [codec][codecs] 进行序列化和反序列化。这意味着需要为稍后使用的 Data Map 条目提供一个 codec：

```java
public record ExampleData(float amount, float chance) {
    public static final Codec<ExampleData> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.FLOAT.fieldOf("amount").forGetter(ExampleData::amount),
            Codec.floatRange(0, 1).fieldOf("chance").forGetter(ExampleData::chance)
    ).apply(instance, ExampleData::new));
}
```

接下来创建 Data Map 本身：

```java
// In this example, we register the data map for the minecraft:item registry, hence we use Item as the generic.
// Adjust the types accordingly if you want to create a data map for a different registry.
public static final DataMapType<Item, ExampleData> EXAMPLE_DATA = DataMapType.builder(
        // The ID of the data map. Data map files for this data map will be located at
        // <yourmodid>:examplemod/data_maps/item/example_data.json.
        Identifier.fromNamespaceAndPath("examplemod", "example_data"),
        // The registry to register the data map for.
        Registries.ITEM,
        // The codec of the data map entries.
        ExampleData.CODEC
).build();
```

最后，在 [mod 事件总线][modbus]的 [`RegisterDataMapTypesEvent`][events] 中注册 Data Map：

```java
@SubscribeEvent // on the mod event bus
public static void registerDataMapTypes(RegisterDataMapTypesEvent event) {
    event.register(EXAMPLE_DATA);
}
```

### 同步

同步型 Data Map 会把值同步到客户端。可以在 builder 上调用 `#synced`，将 Data Map 标记为同步型：

```java
public static final DataMapType<Item, ExampleData> EXAMPLE_DATA = DataMapType.builder(...)
        .synced(
                // The codec used for syncing. May be identical to the normal codec, but may also be
                // a codec with less fields, omitting parts of the object that are not required on the client.
                ExampleData.CODEC,
                // Whether the data map is mandatory or not. Marking a data map as mandatory will disconnect clients
                // that are missing the data map on their side; this includes vanilla clients.
                false
        ).build();
```

### 用法

由于 Data Map 可用于任意 Registry，因此必须通过 `Holder` 查询，而不能通过实际的 Registry 对象查询。此外，它只适用于引用 Holder，不适用于 `Direct` Holder。不过，大多数位置返回的都是引用 Holder，例如 `Registry#wrapAsHolder`、`Registry#getHolder` 或各种 `builtInRegistryHolder` 方法，所以通常不会成为问题。

随后可通过 `Holder#getData(DataMapType)` 查询 Data Map 值。如果对象没有附加 Data Map 值，该方法会返回 `null`。继续使用之前的 `ExampleData`，让玩家每次拾取这些 Item 时获得治疗：

```java
@SubscribeEvent // on the game event bus
public static void itemPickup(ItemEntityPickupEvent.Post event) {
    ItemStack stack = event.getOriginalStack();
    // Get a Holder<Item> via ItemStack#getItemHolder.
    Holder<Item> holder = stack.getItemHolder();
    // Get the data from the holder.
    //highlight-next-line
    ExampleData data = holder.getData(EXAMPLE_DATA);
    if (data != null) {
        // The values are present, so let's do something with them!
        Player player = event.getPlayer();
        if (player.getLevel().getRandom().nextFloat() > data.chance()) {
            player.heal(data.amount());
        }
    }
}
```

这一过程当然也适用于 NeoForge 提供的所有 Data Map。

## 高级 Data Map

高级 Data Map 使用 `AdvancedDataMapType`，而不是标准的 `DataMapType`（`AdvancedDataMapType` 是后者的子类）。它们提供了一些额外功能，即可以指定自定义合并器与自定义移除器。对于值是集合或类似集合类型（如 `List` 或 `Map`）的 Data Map，强烈建议采用此实现。

`DataMapType` 有两个泛型：`R`（Registry 类型）与 `T`（Data Map 值类型）；`AdvancedDataMapType` 则多一个：`VR extends DataMapValueRemover<R, T>`。该泛型允许在保证正确类型安全的情况下通过数据生成创建移除器。

`AdvancedDataMapType` 使用 `AdvancedDataMapType#builder()` 而不是 `DataMapType#builder()` 创建，并返回 `AdvancedDataMapType.Builder`。该 builder 额外提供 `#remover` 与 `#merger` 两个方法，分别用于指定移除器与合并器（见下文）。包括同步在内的其他功能均保持不变。

### 合并器

合并器可用于处理多个数据包尝试为同一对象添加值时产生的冲突。默认合并器（`DataMapValueMerger#defaultMerger`）会用新值覆盖现有值（例如来自优先级较低数据包的值），因此，如果不希望出现这种行为，就需要自定义合并器。

合并器会收到两个冲突值、这些值附加到的对象（表示为 `Either<TagKey<R>, ResourceKey<R>>`，因为值既可附加到标签中的所有对象，也可附加到单个对象），以及对象所属的 Registry；它应返回最终实际附加的值。一般来说，合并器应尽可能只做合并，不执行覆盖（即仅在常规方式无法合并时才覆盖）。如果数据包希望绕过合并器，应在对象上指定 `replace` 字段（参见[添加值][add]）。

假设有一个为 Item 添加整数的 Data Map，那么可以通过将两个值相加来解决冲突：

```java
public class IntMerger implements DataMapValueMerger<Item, Integer> {
    @Override
    public Integer merge(Registry<Item> registry,
            Either<TagKey<Item>, ResourceKey<Item>> first, Integer firstValue,
            Either<TagKey<Item>, ResourceKey<Item>> second, Integer secondValue) {
        return firstValue + secondValue;
    }
}
```

这样，如果一个数据包为 `minecraft:carrot` 指定值 12，另一个数据包为 `minecraft:carrot` 指定值 15，则 `minecraft:carrot` 的最终值为 27。如果其中任一对象指定 `"replace": true`，则使用该对象的值。如果两者都指定 `"replace": true`，则使用优先级更高的数据包中的值。

最后，不要忘记在 builder 中实际指定合并器：

```java
// The types of the data map must match the type of the merger.
AdvancedDataMapType<Item, Integer> ADVANCED_MAP = AdvancedDataMapType.builder(...)
        .merger(new IntMerger())
        .build();
```

:::tip
NeoForge 在 `DataMapValueMerger` 中为列表、集合和 Map 提供了默认合并器。
:::

### 移除器

与用于较复杂数据的合并器类似，移除器可用于正确处理某个元素的 `remove` 子句。默认移除器（`DataMapValueRemover.Default.INSTANCE`）会直接移除与指定对象有关的全部信息；因此，如果只想移除对象数据的一部分，就需要使用自定义移除器。

传给 builder 的 codec（见下文）将用于解码移除器实例。随后，移除器会接收当前附加到对象上的值及其来源，并应返回一个包含替代旧值的新值的 `Optional`。或者，返回空 `Optional` 会使该值真正被移除。

请看以下移除器示例，它会从基于 `Map<String, String>` 的 Data Map 中移除具有特定键的值：

```java
public record MapRemover(String key) implements DataMapValueRemover<Item, Map<String, String>> {
    public static final Codec<MapRemover> CODEC = Codec.STRING.xmap(MapRemover::new, MapRemover::key);
    
    @Override
    public Optional<Map<String, String>> remove(Map<String, String> value, Registry<Item> registry, Either<TagKey<Item>, ResourceKey<Item>> source, Item object) {
        final Map<String, String> newMap = new HashMap<>(value);
        newMap.remove(key);
        return Optional.of(newMap);
    }
}
```

结合此移除器，来看以下数据文件：

```json5
{
    "values": {
        "minecraft:carrot": {
            "somekey1": "value1",
            "somekey2": "value2"
        }
    }
}
```

再来看第二个数据文件，它的优先级高于第一个：

```json5
{
    "remove": {
        // As the remover is decoded as a string, we can use a string as the value here.
        // If it were decoded as an object, we would have needed to use an object.
        "minecraft:carrot": "somekey1"
    }
}
```

这样，应用两个文件后的最终结果（内存中的表示形式）如下：

```json5
{
    "values": {
        "minecraft:carrot": {
            "somekey2": "value2"
        }
    }
}
```

与合并器一样，不要忘记将移除器添加到 builder。请注意，这里只需使用 codec：

```java
// We assume AdvancedData contains a Map<String, String> property of some sort.
AdvancedDataMapType<Item, AdvancedData> ADVANCED_MAP = AdvancedDataMapType.builder(...)
        .remover(MapRemover.CODEC)
        .build();
```

## 数据生成

可以通过扩展 `DataMapProvider` 并重写 `#gather` 来创建条目，从而通过[数据生成][datagen]创建 Data Map。继续使用之前包含 float 值 `amount` 和 `chance` 的 `ExampleData`，数据生成文件大致如下：

```java
public class MyDataMapProvider extends DataMapProvider {
    public MyDataMapProvider(PackOutput packOutput, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        super(packOutput, lookupProvider);
    }
    
    @Override
    protected void gather() {
        // We create a builder for the EXAMPLE_DATA data map and add our entries using #add.
        this.builder(EXAMPLE_DATA)
                // We turn on replacing. Don't ever ship a mod like this! This is purely for educational purposes.
                .replace(true)
                // We add the value "amount": 10, "chance": 1 for all slabs. The boolean parameter controls
                // the "replace" field, which should always be false in a mod.
                .add(ItemTags.SLABS, new ExampleData(10, 1), false)
                // We add the value "amount": 5, "chance": 0.2 for apples.
                .add(Items.APPLE.builtInRegistryHolder(), new ExampleData(5, 0.2f), false) // Can also use Registry#wrapAsHolder to get the holder of a registry object
                // We remove wooden slabs again.
                .remove(ItemTags.WOODEN_SLABS)
                // We add a mod loaded condition for Botania, because why not.
                .conditions(new ModLoadedCondition("botania"));
    }
}
```

这会生成以下 JSON 文件：

```json5
{
    "replace": true,
    "values": {
        "#minecraft:slabs": {
            "amount": 10,
            "chance": 1.0
        },
        "minecraft:apple": {
            "amount": 5,
            "chance": 0.2
        }
    },
    "remove": [
        "#minecraft:wooden_slabs"
    ],
    "neoforge:conditions": [
        {
            "type": "neoforge:mod_loaded",
            "modid": "botania"
        }
    ]
}
```

与所有数据提供器一样，不要忘记将该提供器添加到事件：

```java
@SubscribeEvent // on the mod event bus
public static void gatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createProvider(MyDataMapProvider::new);
}
```

[builtin]: builtin.md
[codecs]: ../../../datastorage/codecs.md
[conditions]: ../conditions.md
[datagen]: ../../index.md#data-generation
[events]: ../../../concepts/events.md
[add]: #adding-values
[mergers]: #mergers
[modbus]: ../../../concepts/events.md#event-buses
[removers]: #removers
[tags]: ../tags.md
