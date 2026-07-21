# 数据加载条件（Data Load Conditions）

有时，我们会希望在另一个 mod 存在时，或者任意 mod 添加了另一种矿石时，禁用或启用某些功能。针对这类用例，NeoForge 添加了数据加载条件。它们最初称为配方条件，因为配方是该系统最早的使用场景；此后，该系统已扩展到其他系统。这也是部分内置条件仅适用于 Item 的原因。

大多数 JSON 文件都可以选择在根对象中声明一个 `neoforge:conditions` 块；在真正加载数据文件之前，会先对该块求值。当且仅当所有条件均通过时才会继续加载，否则将忽略该数据文件。（此规则的例外是[战利品表][loottable]，它会改为被一个空战利品表替代。）

```json5
{
    "neoforge:conditions": [
        {
            // Condition 1
        },
        {
            // Condition 2
        },
        // ...
    ],
    // The rest of the data file
}
```

:::note
如果要加载的值不是映射/对象，则会将其存储在 `neoforge:value` 中：

```json5
{
    "neoforge:conditions": [ /* ...*/ ],
    "neoforge:value": 2 // The value to load
}
```
:::

例如，如果我们只想在 id 为 `examplemod` 的 mod 存在时加载文件，则文件大致如下：

```json5
{
    // highlight-start
    "neoforge:conditions": [
        {
            "type": "neoforge:mod_loaded",
            "modid": "examplemod"
        }
    ],
    // highlight-end
    "type": "minecraft:crafting_shaped",
    // ...
}
```

:::note
大多数原版文件都已通过 `ConditionalCodec` 包装器修补为可以使用条件。不过，并非所有系统都能使用条件，尤其是那些未使用 [codec] 的系统。若要确认某个数据文件能否使用条件，请检查其底层 codec 定义。
:::

## 内置条件

### `neoforge:always` 与 `neoforge:never`

这些条件不包含任何数据，并返回预期值。

```json5
{
    // Will always return true (or false for "neoforge:never")
    "type": "neoforge:always"
}
```

:::tip
使用 `neoforge:never` 条件可以非常干净地禁用任意数据文件。只需在所需位置放置一个包含以下内容的文件：

```json5
{"neoforge:conditions":[{"type":"neoforge:never"}]}
```

以这种方式禁用文件**不会**造成日志刷屏。
:::

### `neoforge:not`

此条件接受另一个条件，并将其结果取反。

```json5
{
    // Inverts the result of the stored condition
    "type": "neoforge:not",
    "value": {
        // Another condition
    }
}
```

### `neoforge:and` 与 `neoforge:or`

这些条件接受要进行运算的条件，并应用相应的逻辑。可接受的条件数量没有限制。

```json5
{
    // ANDs the stored conditions together (or ORs for "neoforge:or")
    "type": "neoforge:and",
    "values": [
        {
            // First condition
        },
        {
            // Second condition
        }
    ]
}
```

### `neoforge:mod_loaded`

如果已加载具有给定 mod id 的 mod，此条件返回 true；否则返回 false。

```json5
{
    "type": "neoforge:mod_loaded",
    // Returns true if "examplemod" is loaded
    "modid": "examplemod"
}
```

### `neoforge:registered`

如果特定 Registry 中具有给定 Registry 名称的对象已经注册，此条件返回 true；否则返回 false。

```json5
{
    "type": "neoforge:registered",
    // The registry to check the value for
    // Defaults to `minecraft:item`
    "registry": "minecraft:item",
    // Returns true if "examplemod:example_item" has been registered
    "value": "examplemod:example_item"
}
```

### `neoforge:tag_empty`

如果给定 Registry [标签][tag]为空，此条件返回 true；否则返回 false。

```json5
{
    "type": "neoforge:tag_empty",
    // The registry to check the tag for
    // Defaults to `minecraft:item`
    "registry": "minecraft:item",
    // Returns true if "examplemod:example_tag" is an empty tag
    "tag": "examplemod:example_tag"
}
```

### `neoforge:feature_flags_enabled`

如果提供的[功能标志][flags]已启用，此条件返回 true；否则返回 false。

```json5
{
    "type": "neoforge:feature_flags_enabled",
    // Returns true if the "examplemod:example_feature" is enabled
    "flags": [
        "examplemod:example_feature"
    ]
}
```

## 创建自定义条件

可以通过实现 `ICondition` 及其 `#test(IContext)` 方法，并为其创建一个[映射 codec][codec] 来创建自定义条件。`#test` 中的 `IContext` 参数能够访问游戏状态的一部分。目前，它只允许你查询 Registry 中的标签。某些带条件的对象可能早于标签加载，此时上下文将是 `IContext.EMPTY`，且完全不包含标签信息。

例如，假设我们想实现一个 `xor` 条件，那么该条件大致如下：

```java
public record XorCondition(ICondition first, ICondition second) implements ICondition {
    public static final MapCodec<XorCondition> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            ICondition.CODEC.fieldOf("first").forGetter(XorCondition::first),
            ICondition.CODEC.fieldOf("second").forGetter(XorCondition::second)
    ).apply(inst, XorCondition::new));

    @Override
    public boolean test(ICondition.IContext context) {
        return this.first.test(context) ^ this.second.test(context);
    }

    @Override
    public MapCodec<? extends ICondition> codec() {
        return CODEC;
    }
}
```

条件使用一个 codec Registry。因此，我们需要像下面这样[注册][register]自己的 codec：

```java
public static final DeferredRegister<MapCodec<? extends ICondition>> CONDITION_CODECS =
        DeferredRegister.create(NeoForgeRegistries.Keys.CONDITION_CODECS, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<XorCondition>> XOR =
        CONDITION_CODECS.register("xor", () -> XorCondition.CODEC);
```

随后，我们就可以在某个数据文件中使用该条件（假设该条件注册在 `examplemod` 命名空间下）：

```json5
{
    "neoforge:conditions": [
        {
            "type": "examplemod:xor",
            "first": {
                // Either this condition is true
                "type": "..."
            },
            "second": {
                // Or this condition, not both!
                "type": "..."
            }
        }
    ],
    // The rest of the data file
}
```

## 数据生成

虽然任何数据包 JSON 文件都可以使用加载条件，但只有少数[数据提供器][datagen]经过修改，能够生成这些条件。其中包括：

- [`RecipeProvider`][recipeprovider]（通过 `RecipeOutput#withConditions`），包括配方进度
- `JsonCodecProvider` 及其子类 `SpriteSourceProvider`
- [`DataMapProvider`][datamapprovider]
- [`GlobalLootModifierProvider`][glmprovider]
- [`DatapackBuiltinEntriesProvider`][datapackentries]（通过 `Map<ResourceKey<?>, List<ICondition>>` 参数）

对于条件本身，`NeoForgeConditions` 类为每种内置条件类型提供了静态辅助方法，用于返回相应的 `ICondition`。

[codec]: ../../datastorage/codecs
[datagen]: ../index.md#data-generation
[datamapprovider]: datamaps/index.md#data-generation
[datapackentries]: ../../concepts/registries.md#data-generation-for-datapack-registries
[flags]: ../../advanced/featureflags.md
[glmprovider]: loottables/glm.md#datagen
[loottable]: loottables/index.md
[recipeprovider]: recipes/index.md#data-generation
[register]: ../../concepts/registries
[tag]: tags.md
