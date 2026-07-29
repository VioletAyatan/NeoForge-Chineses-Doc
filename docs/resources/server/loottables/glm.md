# 全局战利品修改器（Global Loot Modifiers）

全局战利品修改器（简称 GLM）是一种由数据驱动的掉落物修改方式。借助 GLM，无需覆盖数十乃至数百个原版战利品表，也能在不知道当前加载了哪些 mod 的情况下，处理需要与其他 mod 战利品表交互的效果。

GLM 的工作方式是先抽取关联的[战利品表][loottable]，再将 GLM 应用于抽取结果。GLM 还会叠加，而不是采用后加载者覆盖前者的方式，从而允许多个 mod 修改同一个战利品表；这一点与[标签][tags]类似。

注册 GLM 需要三项内容：

- 表示战利品修改器的 JSON 文件。此文件包含修改所需的全部数据，数据包可以据此调整效果。文件位于 `data/<namespace>/loot_modifiers/<path>.json`。
- 一个实现 `IGlobalLootModifier`，或扩展 `LootModifier`（后者本身实现了 `IGlobalLootModifier`）的类。此类包含使修改器生效的代码。
- 一个用于编码和解码战利品修改器类的映射 [codec]。通常将其实现为战利品修改器类中的 `public static final` 字段。

## 战利品修改器 JSON

此文件包含与修改器相关的全部值，例如应用概率、要添加哪些物品等。JSON 位于 `data/<namespace>/loot_modifiers/<path>.json`，其中 `<namespace>` 与 `<path>` 是唯一 [`Identifier`][identifier] 的组成部分。建议尽可能避免硬编码数值，以便数据包制作者按需调整平衡。战利品修改器至少必须包含两个字段，并可根据实际情况包含更多字段：

- `type` 字段包含战利品修改器的注册名。
- `conditions` 字段是用于激活该修改器的战利品表条件列表。
- 根据所使用的 codec，可能还需要或可以选择提供其他属性。

:::tip
GLM 的一个常见用途是向某个特定战利品表添加额外战利品。为此，可以使用 [`neoforge:loot_table_id` 条件][loottableid]。
:::

用法示例如下：

```json5
{
    // 这是战利品修改器的注册表名称
    "type": "examplemod:my_loot_modifier",
    "conditions": [
        // 战利品表条件在这里
    ],
    // 通常由战利品修改器提供的可选属性
    // 表示修饰符的应用顺序，
    // 从最高到最低。
    // 通常默认为 1000。
    "priority": 900,
    // 编解码器指定的额外属性
    "field1": "somestring",
    "field2": 10,
    "field3": "minecraft:dirt"
}
```

## `IGlobalLootModifier` 与 `LootModifier`

要真正将战利品修改器应用到战利品表，必须指定一个 `IGlobalLootModifier` 实现。多数情况下，应使用 `LootModifier` 子类，它会代为处理条件和优先级等内容。首先，让战利品修改器类扩展 `LootModifier`：

```java
// 我们无法使用 record，因为 record 无法扩展其他类。
public class MyLootModifier extends LootModifier {
    // 请参阅下文了解编解码器的工作原理。
    public static final MapCodec<MyLootModifier> CODEC = ...;
    // 我们的额外属性。
    private final String field1;
    private final int field2;
    private final Item field3;
    
    // 构造器的第一个参数是条件列表。剩下的就是我们的额外属性。
    public MyLootModifier(LootItemCondition[] conditions, int priority, String field1, int field2, Item field3) {
        super(conditions, priority);
        this.field1 = field1;
        this.field2 = field2;
        this.field3 = field3;
    }
    
    // 在此处返回我们的编解码器。
    @Override
    public MapCodec<? extends IGlobalLootModifier> codec() {
        return CODEC;
    }
    
    // 这是执行实际修改的位置。如果需要，请在此处使用你的额外属性。
    // 参数是现有的战利品和战利品上下文。
    @Override
    protected ObjectArrayList<ItemStack> doApply(ObjectArrayList<ItemStack> generatedLoot, LootContext context) {
        // 在此将你的物品添加到 generatedLoot。
        return generatedLoot;
    }
}
```

:::info
修改器返回的掉落物列表会按照 `priority` 从高到低依次传给其他修改器。因此，经过修改的战利品可能且理应继续被另一个战利品修改器修改。
:::

## 战利品修改器 Codec

为了让游戏知道该战利品修改器的存在，必须为其定义并[注册][register]一个 [codec]。继续使用之前包含三个字段的示例，代码大致如下：

```java
public static final MapCodec<MyLootModifier> CODEC = RecordCodecBuilder.mapCodec(inst -> 
        // LootModifier#codecStart 添加条件字段。
        LootModifier.codecStart(inst).and(inst.group(
                Codec.STRING.fieldOf("field1").forGetter(e -> e.field1),
                Codec.INT.fieldOf("field2").forGetter(e -> e.field2),
                BuiltInRegistries.ITEM.byNameCodec().fieldOf("field3").forGetter(e -> e.field3)
        )).apply(inst, MyLootModifier::new)
);
```

随后将该 codec [注册][register]到注册表：

```java
public static final DeferredRegister<MapCodec<? extends IGlobalLootModifier>> GLOBAL_LOOT_MODIFIER_SERIALIZERS =
        DeferredRegister.create(NeoForgeRegistries.Keys.GLOBAL_LOOT_MODIFIER_SERIALIZERS, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<MyLootModifier>> MY_LOOT_MODIFIER =
        GLOBAL_LOOT_MODIFIER_SERIALIZERS.register("my_loot_modifier", () -> MyLootModifier.CODEC);
```

## 内置战利品修改器

NeoForge 提供了一个可直接使用的战利品修改器：

### `neoforge:add_table`

此战利品修改器会抽取第二个战利品表，并将结果添加到应用该修改器的战利品表中。

```json5
{
    "type": "neoforge:add_table",
    "conditions": [], // 所需的战利品条件
    "priority": 1000, // 可选的执行优先级
    "table": "minecraft:chests/abandoned_mineshaft" // 要抽取的第二张战利品表
}
```

## 数据生成

GLM 可以通过[数据生成][datagen]创建。为此，需要继承 `GlobalLootModifierProvider`：

```java
public class MyGlobalLootModifierProvider extends GlobalLootModifierProvider {
    // 从`GatherDataEvent`中获取参数。
    public MyGlobalLootModifierProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        super(output, registries, ExampleMod.MOD_ID);
    }
    
    @Override
    protected void start() {
        // 调用 #add添加一个新 GLM。这也在 global_loot_modifiers.json 中添加了相应的条目。
        this.add(
                // 修改器的名称。这将是文件名。
                "my_loot_modifier_instance",
                // 要添加的战利品修改器。为了举例，我们添加了天气战利品条件。
                new MyLootModifier(new LootItemCondition[] {
                        WeatherCheck.weather().setRaining(true).build()
                }, 900, "somestring", 10, Items.DIRT),
                // 数据加载条件列表。请注意，这些与战利品条件无关
                // 在修饰符本身上指定。为了举例，我们添加了一个模组加载条件。
                // #add 的重载可用，它接受条件的可变参数而不是列表。
                List.of(new ModLoadedCondition("create"))
        );
    }
}
```

与所有数据提供器一样，必须将该提供器注册到 `GatherDataEvent`：

```java
@SubscribeEvent // 位于模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，请先调用 event.createDatapackRegistryObjects(...)

    event.createProvider(MyGlobalLootModifierProvider::new);
}
```

[codec]: ../../../datastorage/codecs.md
[datagen]: ../../index.md#数据生成
[loottable]: index.md
[loottableid]: lootconditions#neoforgeloot_table_id
[register]: ../../../concepts/registries.md#methods-for-registering
[identifier]: ../../../misc/identifier.md
[tags]: ../tags.md
