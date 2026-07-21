import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 附魔

附魔是可以应用于工具及其他 Item 的特殊效果。从 1.21 开始，附魔以[数据组件][Data Components]的形式存储在 Item 上，在 JSON 中定义，并由所谓的附魔效果组件构成。游戏运行期间，特定 Item 上的附魔存放在 `DataComponents.ENCHANTMENTS` 组件中的 `ItemEnchantments` 实例里。

在命名空间的数据包 `enchantment` 子文件夹中创建 JSON 文件即可添加新附魔。例如，要创建名为 `examplemod:example_enchant` 的附魔，应创建文件 `data/examplemod/enchantment/example_enchantment.json`。

## 附魔 JSON 格式

```json5
{
    // The text component that will be used as the in-game name of the enchantment.
    // Can be a translation key or a literal string. 
    // Remember to translate this in your lang file if you use a translation key!
    "description": {
        "translate": "enchantment.examplemod.enchant_name"
    },
    
    // Which items this enchantment can be applied to.
    // Can be either an item id, such as "minecraft:trident",
    // or a list of item ids, such as ["examplemod:red_sword", "examplemod:blue_sword"]
    // or an item tag, such as "#examplemod:enchantable/enchant_name".
    // Note that this doesn't cause the enchantment to appear for these items in the enchanting table.
    "supported_items": "#examplemod:enchantable/enchant_name",

    // (Optional) Which items this enchantment appears for in the enchanting table or as part of an enchantment provider.
    // For the enchantment to be shown in an enchantment table for the item, it must be added to the `minecraft:in_enchanting_table` tag.
    // `minecraft:non_treasure` entries are already in the enchantment table tag by default.
    // Can be an item, list of items, or item tag.
    // If left unspecified, this is the same as `supported_items`.
    "primary_items": [
        "examplemod:item_a",
        "examplemod:item_b"
    ],

    // (Optional) Which enchantments are incompatible with this one.
    // Can be an enchantment id, such as "minecraft:sharpness",
    // or a list of enchantment ids, such as ["minecraft:sharpness", "minecraft:fire_aspect"],
    // or enchantment tag, such as "#examplemod:exclusive_to_enchant_name".
    // Incompatible enchantments will not be added to the same item by vanilla mechanics.
    "exclusive_set": "#examplemod:exclusive_to_enchant_name",
    
    // The likelihood that this enchantment will appear in the Enchanting Table. 
    // Bounded by [1, 1024].
    "weight": 6,
    
    // The maximum level this enchantment is allowed to reach.
    // Bounded by [1, 255].
    "max_level": 3,
    
    // The maximum cost of this enchantment, measured in "enchanting power". 
    // This corresponds to, but is not equivalent to, the threshold in levels the player needs to meet to bestow this enchantment.
    // See below for details.
    // The actual cost will be between this and the min_cost.
    "max_cost": {
        "base": 45,
        "per_level_above_first": 9
    },
    
    // Specifies the minimum cost of this enchantment; otherwise as above.
    "min_cost": {
        "base": 2,
        "per_level_above_first": 8
    },

    // The cost that this enchantment adds to repairing an item in an anvil in levels. The cost is multiplied by enchantment level.
    // If an item has a DataComponentTypes.STORED_ENCHANTMENTS component, the cost is halved. In vanilla, this only applies to enchanted books.
    // Bounded by [1, inf).
    "anvil_cost": 2,
    
    // (Optional) A list of slot groups this enchantment provides effects in. 
    // A slot group is defined as one of the possible values of the EquipmentSlotGroup enum.
    // In vanilla, these are: `any`, `hand`, `mainhand`, `offhand`, `armor`, `feet`, `legs`, `chest`, `head`, and  `body`.
    "slots": [
        "mainhand"
    ],

    // The effects that this enchantment provides as a map of enchantment effect components (read on).
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

附魔效果组件是经过特殊注册的[数据组件][Data Components]，用于决定附魔如何生效。组件类型定义其效果，组件包含的数据则用于描述或修改该效果。例如，`minecraft:damage` 组件会按照其数据决定的数值修改武器造成的伤害。

原版定义了多种[内置附魔效果组件][built-in enchantment effect components]，用于实现所有原版附魔。

### 自定义附魔效果组件

应用自定义附魔效果组件的逻辑必须完全由其创建者实现。首先，应定义一个类或 record，用于保存实现特定效果所需的信息。例如，创建一个示例 record 类 `Increment`：

```java
// Define an example data-bearing record.
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
// In some registration class
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
// Somewhere in game logic where an `itemStack` is available.
// `INCREMENT` is the enchantment component type holder defined above.
// `value` is an integer.
AtomicInteger atomicValue = new AtomicInteger(value);

EnchantmentHelper.runIterationOnItem(stack, (enchantmentHolder, enchantLevel) -> {
    // Acquire the Increment instance from the enchantment holder (or null if this is a different enchantment)
    Increment increment = enchantmentHolder.value().effects().get(INCREMENT.get());

    // If this enchant has an Increment component, use it.
    if(increment != null){
        atomicValue.set(increment.add(atomicValue.get()));
    }
});

int modifiedValue = atomicValue.get();
// Use the now-modified value elsewhere in your game logic.
```

首先，调用 `EnchantmentHelper#runIterationOnItem` 的某个重载。该函数接受 `EnchantmentHelper.EnchantmentVisitor`；这是一个接收附魔及其等级的函数式接口，会对给定 ItemStack 拥有的所有附魔调用（本质上是 `BiConsumer<Holder<Enchantment>, Integer>`）。

要实际执行调整，请使用提供的 `Increment#add` 方法。由于它位于 lambda 表达式内，因此需要使用可进行原子更新的类型（例如 `AtomicInteger`）来修改该值。这也允许多个 `INCREMENT` 组件在同一个 Item 上运行并叠加效果，与原版行为相同。

### `ConditionalEffect`
使用 `ConditionalEffect<?>` 包装类型后，附魔效果组件可以根据给定 [LootContext] 选择性生效。

`ConditionalEffect` 提供 `ConditionalEffect#matches(LootContext context)`，它根据内部的 `Optional<LootItemConditon>` 返回是否应允许运行效果，并负责其 `LootItemCondition` 的序列化与反序列化。

原版还添加了一个辅助方法，以进一步简化条件检查过程：`Enchantment#applyEffects()`。该方法接收 `List<ConditionalEffect<T>>`，对条件求值，并针对每个条件满足的 `ConditionalEffect` 所包含的 `T` 运行 `Consumer<T>`。由于许多原版附魔效果组件都定义为 `List<ConditionalEffect<?>>`，因此可以像下面这样直接传入该辅助方法：

```java
// `enchant` is an Enchantment instance.
// `lootContext` is a LootContext instance.
enchant.applyEffects(
    // Or whichever other List<ConditionalEffect<T>> you want
    enchant.getEffects(EnchantmentEffectComponents.KNOCKBACK),
    // The context to test the conditions against
    lootContext,
    (effectData) -> // Use the effectData (in this example, an EnchantmentValueEffect) however you want.
);
```

可以按如下方式注册一个由自定义 `ConditionalEffect` 包装的附魔效果组件类型：

```java
public static final DeferredHolder<DataComponentType<?>, DataComponentType<ConditionalEffect<Increment>>> CONDITIONAL_INCREMENT =
    ENCHANTMENT_COMPONENT_TYPES.register("conditional_increment",
        () -> DataComponentType.ConditionalEffect<Increment>builder()
            // The ContextKeySet needed depends on what the enchantment is supposed to do.
            // This might be one of ENCHANTED_DAMAGE, ENCHANTED_ITEM, ENCHANTED_LOCATION, ENCHANTED_ENTITY, or HIT_BLOCK
            // since all of these bring the enchantment level into context (along with whatever other information is indicated).
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

// This RegistrySetBuilder should be passed into a DatapackBuiltinEntriesProvider in your `GatherDataEvent`s listener.
RegistrySetBuilder BUILDER = new RegistrySetBuilder();
BUILDER.add(
    Registries.ENCHANTMENT,
    bootstrap -> bootstrap.register(
        // Define the ResourceKey for our enchantment.
        ResourceKey.create(
            Registries.ENCHANTMENT,
            Identifier.fromNamespaceAndPath("examplemod", "example_enchantment")
        ),
        new Enchantment(
            // The text Component that specifies the enchantment's name.
            Component.literal("Example Enchantment"),  
            
            // Specify the enchantment definition of for our enchantment.
            new Enchantment.EnchantmentDefinition(
                // A HolderSet of Items that the enchantment will be compatible with.
                HolderSet.direct(...), 

                // An Optional<HolderSet> of items that the enchantment considers "primary".
                Optional.empty(), 

                // The weight of the enchantment.
                30, 

                // The maximum level this enchantment can be.
                3, 

                // The minimum cost of the enchantment. The first parameter is base cost, the second is cost per level.
                Enchantment.dynamicCost(3, 1), 

                // The maximum cost of the enchantment. As above.
                Enchantment.dynamicCost(4, 2), 

                // The anvil cost of the enchantment.
                2, 

                // A list of EquipmentSlotGroups that this enchantment has effects in.
                List.of(EquipmentSlotGroup.ANY) 
            ),
            // A HolderSet of incompatible other enchantments.
            HolderSet.empty(), 

            // A DataComponentMap of the enchantment effect components associated with this enchantment and their values.
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
// For more detail on each entry, please check the section above on the enchantment JSON format.
{
    // The anvil cost of the enchantment.
    "anvil_cost": 2,

    // The text Component that specifies the enchantment's name.
    "description": "Example Enchantment",

    // A map of the effect components associated with this enchantment and their values.
    "effects": {
        // <effect components>
    },

    // The maximum cost of the enchantment.
    "max_cost": {
        "base": 4,
        "per_level_above_first": 2
    },

    // The maximum level this enchantment can be.
    "max_level": 3,

    // The minimum cost of the enchantment.
    "min_cost": {
        "base": 3,
        "per_level_above_first": 1
    },

    // A list of EquipmentSlotGroup aliases that this enchantment has effects in.
    "slots": [
        "any"
    ],

    // The set of items that this enchantment can be applied to using an anvil.
    "supported_items": /* <supported item list> */,

    // The weight of this enchantment.
    "weight": 30
}
```

</TabItem>
</Tabs>

[Data Components]: ../../../items/datacomponents.md
[Codec]: ../../../datastorage/codecs.md
[Enchantment definition Minecraft wiki page]: https://minecraft.wiki/w/Enchantment_definition
[registered]: ../../../concepts/registries.md
[Predicate]: https://minecraft.wiki/w/Predicate
[data generation]: ../../../resources/index.md#data-generation
[Data Generation for Datapack Registries]: https://docs.neoforged.net/docs/concepts/registries/#data-generation-for-datapack-registries
[relevant minecraft wiki page]: https://minecraft.wiki/w/Enchantment_definition#Entity_effects
[built-in enchantment effect components]: builtin.md
[LootContext]: ../loottables/index.md#loot-context
