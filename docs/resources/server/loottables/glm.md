# 全局战利品修改器（Global Loot Modifiers）

全局战利品修改器（简称 GLM）是一种由数据驱动的掉落物修改方式。借助 GLM，无需覆盖数十乃至数百个原版战利品表，也能在不知道当前加载了哪些 mod 的情况下，处理需要与其他 mod 战利品表交互的效果。

GLM 的工作方式是先抽取关联的[战利品表][loottable]，再将 GLM 应用于抽取结果。GLM 还会叠加，而不是采用后加载者覆盖前者的方式，从而允许多个 mod 修改同一个战利品表；这一点与[标签][tags]类似。

注册 GLM 需要三项内容：

- 表示战利品修改器的 JSON 文件。此文件包含修改所需的全部数据，数据包可以据此调整效果。文件位于 `data/<namespace>/loot_modifiers/<path>.json`。
- 一个实现 `IGlobalLootModifier`，或扩展 `LootModifier`（后者本身实现了 `IGlobalLootModifier`）的类。此类包含使修改器生效的代码。
- 一个用于编码和解码战利品修改器类的映射 [codec]。通常将其实现为战利品修改器类中的 `public static final` 字段。

## 战利品修改器 JSON

此文件包含与修改器相关的全部值，例如应用概率、要添加哪些 Item 等。JSON 位于 `data/<namespace>/loot_modifiers/<path>.json`，其中 `<namespace>` 与 `<path>` 是唯一 [`Identifier`][identifier] 的组成部分。建议尽可能避免硬编码数值，以便数据包制作者按需调整平衡。战利品修改器至少必须包含两个字段，并可根据实际情况包含更多字段：

- `type` 字段包含战利品修改器的 Registry 名称。
- `conditions` 字段是用于激活该修改器的战利品表条件列表。
- 根据所使用的 codec，可能还需要或可以选择提供其他属性。

:::tip
GLM 的一个常见用途是向某个特定战利品表添加额外战利品。为此，可以使用 [`neoforge:loot_table_id` 条件][loottableid]。
:::

用法示例如下：

```json5
{
    // This is the registry name of the loot modifier
    "type": "examplemod:my_loot_modifier",
    "conditions": [
        // Loot table conditions here
    ],
    // An optional property typically provided by loot modifiers
    // to denote the order that the modifiers should be applied,
    // from highest to lowest.
    // Typically defaults to 1000.
    "priority": 900,
    // Extra properties specified by the codec
    "field1": "somestring",
    "field2": 10,
    "field3": "minecraft:dirt"
}
```

## `IGlobalLootModifier` 与 `LootModifier`

要真正将战利品修改器应用到战利品表，必须指定一个 `IGlobalLootModifier` 实现。多数情况下，应使用 `LootModifier` 子类，它会代为处理条件和优先级等内容。首先，让战利品修改器类扩展 `LootModifier`：

```java
// We cannot use a record because records cannot extend other classes.
public class MyLootModifier extends LootModifier {
    // See below for how the codec works.
    public static final MapCodec<MyLootModifier> CODEC = ...;
    // Our extra properties.
    private final String field1;
    private final int field2;
    private final Item field3;
    
    // First constructor parameter is the list of conditions. The rest is our extra properties.
    public MyLootModifier(LootItemCondition[] conditions, int priority, String field1, int field2, Item field3) {
        super(conditions, priority);
        this.field1 = field1;
        this.field2 = field2;
        this.field3 = field3;
    }
    
    // Return our codec here.
    @Override
    public MapCodec<? extends IGlobalLootModifier> codec() {
        return CODEC;
    }
    
    // This is where the magic happens. Use your extra properties here if needed.
    // Parameters are the existing loot, and the loot context.
    @Override
    protected ObjectArrayList<ItemStack> doApply(ObjectArrayList<ItemStack> generatedLoot, LootContext context) {
        // Add your items to generatedLoot here.
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
        // LootModifier#codecStart adds the conditions field.
        LootModifier.codecStart(inst).and(inst.group(
                Codec.STRING.fieldOf("field1").forGetter(e -> e.field1),
                Codec.INT.fieldOf("field2").forGetter(e -> e.field2),
                BuiltInRegistries.ITEM.byNameCodec().fieldOf("field3").forGetter(e -> e.field3)
        )).apply(inst, MyLootModifier::new)
);
```

随后将该 codec [注册][register]到 Registry：

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
    "conditions": [], // the required loot conditions
    "priority": 1000, // the optional priority of execution
    "table": "minecraft:chests/abandoned_mineshaft" // the second table to roll
}
```

## 数据生成

GLM 可以通过[数据生成][datagen]创建。为此，需要继承 `GlobalLootModifierProvider`：

```java
public class MyGlobalLootModifierProvider extends GlobalLootModifierProvider {
    // Get the parameters from the `GatherDataEvent`s.
    public MyGlobalLootModifierProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        super(output, registries, ExampleMod.MOD_ID);
    }
    
    @Override
    protected void start() {
        // Call #add to add a new GLM. This also adds a corresponding entry in global_loot_modifiers.json.
        this.add(
                // The name of the modifier. This will be the file name.
                "my_loot_modifier_instance",
                // The loot modifier to add. For the sake of example, we add a weather loot condition.
                new MyLootModifier(new LootItemCondition[] {
                        WeatherCheck.weather().setRaining(true).build()
                }, 900, "somestring", 10, Items.DIRT),
                // A list of data load conditions. Note that these are unrelated to the loot conditions
                // specified on the modifier itself. For the sake of example, we add a mod loaded condition.
                // An overload of #add is available that accepts a vararg of conditions instead of a list.
                List.of(new ModLoadedCondition("create"))
        );
    }
}
```

与所有数据提供器一样，必须将该提供器注册到 `GatherDataEvent`：

```java
@SubscribeEvent // on the mod event bus
public static void onGatherData(GatherDataEvent.Client event) {
    // Call event.createDatapackRegistryObjects(...) first if adding datapack objects

    event.createProvider(MyGlobalLootModifierProvider::new);
}
```

[codec]: ../../../datastorage/codecs.md
[datagen]: ../../index.md#data-generation
[loottable]: index.md
[loottableid]: lootconditions#neoforgeloot_table_id
[register]: ../../../concepts/registries.md#methods-for-registering
[identifier]: ../../../misc/identifier.md
[tags]: ../tags.md
