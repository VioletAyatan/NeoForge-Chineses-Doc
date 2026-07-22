# 附魔（Enchantments）

附魔是可以应用于工具及其他 Item 的特殊效果。从 1.21 开始，附魔以[数据组件][数据组件]的形式存储在 Item 上，在 JSON 中定义，并由所谓的附魔效果组件构成。游戏运行期间，特定 Item 上的附魔存放在 `DataComponents.ENCHANTMENTS` 组件中的 `ItemEnchantments` 实例里。

在命名空间的数据包 `enchantment` 子文件夹中创建 JSON 文件即可添加新附魔。例如，要创建名为 `examplemod:example_enchant` 的附魔，应创建文件 `data/examplemod/enchantment/example_enchantment.json`。

## 附魔 JSON 格式

```json5
{
    // 将用作附魔的游戏内名称的文本组件。
    // 可以是翻译键或文字字符串。
    // 如果你使用翻译键，请记住在你的 lang 文件中翻译此！
    "description": {
        "translate": "enchantment.examplemod.enchant_name"
    },
    
    // 此附魔可以应用于哪些物品。
    // 可以是物品 ID，例如 "minecraft:trident"，
    // 或物品 ID 列表，例如 ["examplemod:red_sword", "examplemod:blue_sword"]
    // 或物品标签，例如 "#examplemod:enchantable/enchant_name"。
    // 请注意，这不会让附魔出现在这些物品的附魔台选项中。
    "supported_items": "#examplemod:enchantable/enchant_name",

    // （可选）此附魔可在附魔台或附魔提供器中出现在哪些物品上。
    // 要让附魔出现在物品的附魔台选项中，还必须将其加入 `minecraft:in_enchanting_table` 标签。
    // 默认情况下，`minecraft:non_treasure` 条目已包含在该标签中。
    // 可以是物品、物品列表或物品标签。
    // 未指定时，与 `supported_items` 相同。
    "primary_items": [
        "examplemod:item_a",
        "examplemod:item_b"
    ],

    // （可选）与此附魔不兼容的附魔。
    // 可以是附魔 ID，例如 "minecraft:sharpness"，
    // 或附魔 ID 列表，例如 ["minecraft:sharpness", "minecraft:fire_aspect"]，
    // 或附魔标签，例如 "#examplemod:exclusive_to_enchant_name"。
    // 原版机制不会将不兼容的附魔添加到同一物品中。
    "exclusive_set": "#examplemod:exclusive_to_enchant_name",
    
    // 此附魔出现在附魔台中的权重。
    // 以 [1, 1024] 为界。
    "weight": 6,
    
    // 此附魔允许达到的最高等级。
    // 以 [1, 255] 为界。
    "max_level": 3,
    
    // 此附魔的最高附魔成本，以 enchanting power 衡量。
    // 这对应于但不等同于玩家授予此附魔所需达到的等级阈值。
    // 详情请参见下文。
    // 实际成本位于 min_cost 与此值之间。
    "max_cost": {
        "base": 45,
        "per_level_above_first": 9
    },
    
    // 指定此附魔的最低成本；否则如上所述。
    "min_cost": {
        "base": 2,
        "per_level_above_first": 8
    },

    // 此附魔在铁砧中修复物品时增加的等级花费；该花费会乘以附魔等级。
    // 如果物品具有 DataComponentTypes.STORED_ENCHANTMENTS 组件，则成本减半。在原版中，这仅适用于附魔书。
    // 以 [1, inf) 为界。
    "anvil_cost": 2,
    
    // （可选）此附魔生效的槽位组列表。
    // 槽位组是 EquipmentSlotGroup 枚举值。
    // 在原版中，这些是：`any`、`hand`、`mainhand`、`offhand`、`armor`、`feet`、`legs`、`chest`、 `head` 和 `body`。
    "slots": [
        "mainhand"
    ],

    // 此附魔提供的效果作为附魔效果组件的映射（继续阅读）。
    "effects": {
        "examplemod:custom_effect": [
            {
                "effect": {
                    "type": "minecraft:add",
                    "value": {
                        "type": "minecraft:linear",
                        "base": 1,
                        "per_level_above_first": 1
                    }
                }
            }
        ]
    }
}
```

### 附魔花费与等级

`max_cost` 与 `min_cost` 字段指定生成此附魔所需附魔能力的上下界。不过，实际使用这些值的过程略显复杂。

首先，附魔台会考虑周围 Block 的 `IBlockExtension#getEnchantPowerBonus()` 返回值。然后据此调用 `EnchantmentHelper#getEnchantmentCost`，为每个槽位算出一个“基础等级”。该等级在游戏菜单中显示为附魔旁边的绿色数字。对于每个附魔，基础等级会被来自 Item 附魔能力的随机值修改两次（附魔能力取自 `DataComponents#ENCHANTABLE` 数据组件，并通过 `Enchantable#value` 提取），如下所示：

`(Modified Level) = (Base Level) + random.nextInt(e / 4 + 1) + random.nextInt(e / 4 + 1)`，其中 `e` 为附魔能力数值。

随后，该修正等级会随机上调或下调 15%，最终用于选择附魔。只有该等级落在自定义附魔的花费范围内，附魔才可能被选中。

在实践中，这意味着附魔定义中的花费值可能高于 30，有时甚至高出很多。例如，对于附魔能力为 10 的 Item，附魔台能够生成花费最高为 `1.15 * (30 + 2 * (10 / 4) + 1) = 40` 的附魔。

## 附魔效果组件

附魔效果组件是经过特殊注册的[数据组件][数据组件]，用于决定附魔如何生效。组件类型定义其效果，组件包含的数据则用于描述或修改该效果。例如，`minecraft:damage` 组件会按照其数据决定的数值修改武器造成的伤害。

原版定义了多种[内置附魔效果组件][built-in enchantment effect components]，用于实现所有原版附魔。

### 自定义附魔效果组件

应用自定义附魔效果组件的逻辑必须完全由其创建者实现。首先，应定义一个类或 record，用于保存实现特定效果所需的信息。例如，创建一个示例 record 类 `Increment`：

```java
// 定义示例数据承载 record。
public record Increment(int value) {
    public static final Codec<Increment> CODEC = RecordCodecBuilder.create(instance ->
            instance.group(
                    Codec.INT.fieldOf("value").forGetter(Increment::value)
            ).apply(instance, Increment::new)
    );

    public int add(int x) {
        return value() + x;
    }
}
```

附魔效果组件类型必须[注册][registered]到 `BuiltInRegistries.ENCHANTMENT_EFFECT_COMPONENT_TYPE`，它接收 `DataComponentType<?>`。例如，可以按如下方式注册一个能够存储 `Increment` 对象的附魔效果组件：

```java
// 在某些注册类中
public static final DeferredRegister.DataComponents ENCHANTMENT_COMPONENT_TYPES =
    DeferredRegister.createDataComponents(BuiltInRegistries.ENCHANTMENT_EFFECT_COMPONENT_TYPE, "examplemod");

public static final Supplier<DataComponentType<Increment>> INCREMENT =
    ENCHANTMENT_COMPONENT_TYPES.registerComponentType(
        "increment",
        builder -> builder.persistent(Increment.CODEC)
    );
```

现在，可以实现一些使用此组件修改整数值的游戏逻辑：

```java
// 游戏逻辑中 `itemStack` 可用的位置。
// `INCREMENT` 是上文定义的附魔组件类型 Holder。
// `value` 是一个整数。
AtomicInteger atomicValue = new AtomicInteger(value);

EnchantmentHelper.runIterationOnItem(stack, (enchantmentHolder, enchantLevel) -> {
    // 从附魔 Holder 获取 Increment 实例（如果是其他附魔，则得到 null）。
    Increment increment = enchantmentHolder.value().effects().get(INCREMENT.get());

    // 如果此附魔有 Increment 组件，请使用它。
    if(increment != null){
        atomicValue.set(increment.add(atomicValue.get()));
    }
});

int modifiedValue = atomicValue.get();
// 在游戏逻辑中的其他地方使用现在修改的值。
```

首先，调用 `EnchantmentHelper#runIterationOnItem` 的某个重载。该函数接受 `EnchantmentHelper.EnchantmentVisitor`；这是一个接收附魔及其等级的函数式接口，会对给定 ItemStack 拥有的所有附魔调用（本质上是 `BiConsumer<Holder<Enchantment>, Integer>`）。

要实际执行调整，请使用提供的 `Increment#add` 方法。由于它位于 lambda 表达式内，因此需要使用可进行原子更新的类型（例如 `AtomicInteger`）来修改该值。这也允许多个 `INCREMENT` 组件在同一个 Item 上运行并叠加效果，与原版行为相同。

### `ConditionalEffect`
使用 `ConditionalEffect<?>` 包装类型后，附魔效果组件可以根据给定 [LootContext] 选择性生效。

`ConditionalEffect` 提供 `ConditionalEffect#matches(LootContext context)`，它根据内部的 `Optional<LootItemConditon>` 返回是否应允许运行效果，并负责其 `LootItemCondition` 的序列化与反序列化。

原版还添加了一个辅助方法，以进一步简化条件检查过程：`Enchantment#applyEffects()`。该方法接收 `List<ConditionalEffect<T>>`，对条件求值，并针对每个条件满足的 `ConditionalEffect` 所包含的 `T` 运行 `Consumer<T>`。由于许多原版附魔效果组件都定义为 `List<ConditionalEffect<?>>`，因此可以像下面这样直接传入该辅助方法：

```java
// `enchant` 是一个附魔实例。
// `lootContext` 是 LootContext 实例。
enchant.applyEffects(
    // 或所需的其他任意 List<ConditionalEffect<T>>
    enchant.getEffects(EnchantmentEffectComponents.KNOCKBACK),
    // 测试条件的上下文
    lootContext,
    (effectData) -> // 根据需要使用 effectData（在此示例中为 EnchantmentValueEffect）。
);
```

可以按如下方式注册一个由自定义 `ConditionalEffect` 包装的附魔效果组件类型：

```java
public static final DeferredHolder<DataComponentType<?>, DataComponentType<ConditionalEffect<Increment>>> CONDITIONAL_INCREMENT =
    ENCHANTMENT_COMPONENT_TYPES.register("conditional_increment",
        () -> DataComponentType.ConditionalEffect<Increment>builder()
            // 所需的 ContextKeySet 取决于附魔的用途。
            // 这可能是 ENCHANTED_DAMAGE、ENCHANTED_ITEM、ENCHANTED_LOCATION、ENCHANTED_ENTITY 或 HIT_BLOCK 之一
            // ，因为所有这些都将附魔级别带入上下文（以及指示的任何其他信息）。
            .persistent(ConditionalEffect.codec(Increment.CODEC, LootContextParamSets.ENCHANTED_DAMAGE))
            .build());
```

`ConditionalEffect.codec` 的参数依次为泛型 `ConditionalEffect<T>` 的 codec，以及某个 `ContextKeySet` 条目。

## 附魔数据生成

可以使用[数据生成][data generation]系统自动创建附魔 JSON 文件：通过 `GatherDataEvent#createDatapackRegistryObjects` 将 `RegistrySetBuilder` 传给 `DatapackBuiltInEntriesProvider`。生成的 JSON 位于 `<project root>/src/generated/data/<modid>/enchantment/<path>.json`。

有关 `RegistrySetBuilder` 与 `DatapackBuiltinEntriesProvider` 工作方式的更多信息，请参阅[数据包 Registry 的数据生成][Data Generation for Datapack Registries]一文。

<Tabs>
<TabItem value="datagen" label="数据生成">

```java

// 应将此 RegistrySetBuilder 传给 `GatherDataEvent` 监听器中的 DatapackBuiltinEntriesProvider。
RegistrySetBuilder BUILDER = new RegistrySetBuilder();
BUILDER.add(
    Registries.ENCHANTMENT,
    bootstrap -> bootstrap.register(
        // 为我们的附魔定义 ResourceKey。
        ResourceKey.create(
            Registries.ENCHANTMENT,
            Identifier.fromNamespaceAndPath("examplemod", "example_enchantment")
        ),
        new Enchantment(
            // 指定附魔名称的文本组件。
            Component.literal("Example Enchantment"),  
            
            // 指定此附魔的定义。
            new Enchantment.EnchantmentDefinition(
                // 与此附魔兼容的 Item HolderSet。
                HolderSet.direct(...), 

                // 此附魔视为 primary 的物品 Optional<HolderSet>。
                Optional.empty(), 

                // 附魔的重量。
                30, 

                // 此附魔可达到的最高等级。
                3, 

                // 附魔的最低成本。第一个参数是基本成本，第二个参数是每级成本。
                Enchantment.dynamicCost(3, 1), 

                // 附魔的最大成本。如上所述。
                Enchantment.dynamicCost(4, 2), 

                // 附魔的铁砧成本。
                2, 

                // 此附魔生效的 EquipmentSlotGroup 列表。
                List.of(EquipmentSlotGroup.ANY) 
            ),
            // 不兼容的其他附魔的 HolderSet。
            HolderSet.empty(), 

            // 与此附魔及其值相关的附魔效果组件的 DataComponentMap。
            DataComponentMap.builder() 
                .set(MY_ENCHANTMENT_EFFECT_COMPONENT_TYPE, new ExampleData())
                .build()
        )
    )
);

```

</TabItem>

<TabItem value="json" label="JSON" default>

```json5
// 有关每个条目的更多详细信息，请查看上面有关附魔 JSON 格式的部分。
{
    // 附魔的铁砧成本。
    "anvil_cost": 2,

    // 指定附魔名称的文本组件。
    "description": "Example Enchantment",

    // 与此附魔相关的效果组件及其值的映射。
    "effects": {
        // <效果组件>
    },

    // 附魔的最大成本。
    "max_cost": {
        "base": 4,
        "per_level_above_first": 2
    },

    // 此附魔可达到的最高等级。
    "max_level": 3,

    // 附魔的最低成本。
    "min_cost": {
        "base": 3,
        "per_level_above_first": 1
    },

    // 此附魔生效的 EquipmentSlotGroup 别名列表。
    "slots": [
        "any"
    ],

    // 可以使用铁砧应用此附魔的一组物品。
    "supported_items": /* <支持的物品列表>*/,

    // 此附魔的重量。
    "weight": 30
}
```

</TabItem>
</Tabs>

[数据组件]: ../../../items/datacomponents.md
[Codec]: ../../../datastorage/codecs.md
[Enchantment definition Minecraft wiki page]: https://minecraft.wiki/w/Enchantment_definition
[registered]: ../../../concepts/registries.md
[Predicate]: https://minecraft.wiki/w/Predicate
[data generation]: ../../../resources/index.md#data-generation
[Data Generation for Datapack Registries]: https://docs.neoforged.net/docs/concepts/registries/#data-generation-for-datapack-registries
[relevant minecraft wiki page]: https://minecraft.wiki/w/Enchantment_definition#Entity_effects
[built-in enchantment effect components]: builtin.md
[LootContext]: ../loottables/index.md#loot-context
