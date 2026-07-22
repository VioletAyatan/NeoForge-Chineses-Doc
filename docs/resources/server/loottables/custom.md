# 自定义战利品对象（Custom Loot Objects）

由于战利品表系统较为复杂，其中会使用多个 [Registry][registries]；mod 开发者可以利用它们中的任何一个来添加更多行为。

所有与战利品表有关的 Registry 都遵循相似模式。要添加新的 Registry 条目，通常需要扩展某个类或实现某个承载功能的接口；随后为序列化定义一个 [codec]，并像往常一样使用 `DeferredRegister` 将该 codec 注册到相应 Registry。这个过程符合大多数 Registry 所采用的“一个基础对象，多个实例”方式（例如 Block/BlockState 和 Item/ItemStack 也是如此）。

## 自定义战利品条目

要创建自定义战利品条目，请扩展 `LootPoolEntryContainer`，或扩展它的两个直接子类之一：`LootPoolSingletonContainer` 或 `CompositeEntryBase`。作为示例，我们要创建一个能够返回某个 [Entity][entity] 掉落物的战利品条目——这纯粹用于演示，实践中更理想的做法是直接引用另一个战利品表。首先创建战利品条目类：

```java
// 我们扩展了 LootPoolSingletonContainer，因为我们有 "finite" 的 drop 集。
// 此代码的部分内容改编自 NestedLootTable。
public class EntityLootEntry extends LootPoolSingletonContainer {
    public static final MapCodec<EntityLootEntry> CODEC = RecordCodecBuilder.mapCodec(inst ->
        // 添加我们自己的字段。
        inst.group(
                        // 引用实体类型 ID 的值。
                        BuiltInRegistries.ENTITY_TYPE.holderByNameCodec().fieldOf("entity").forGetter(e -> e.entity)
                )
                // 添加常用字段：重量、显示、条件、功能。
                .and(singletonFields(inst))
                .apply(inst, EntityLootEntry::new)
    );

    // 要用于抽取另一张战利品表的实体类型 Holder。
    private final Holder<EntityType<?>> entity;

    // 通常的做法是拥有一个 private 构造器和一个 static 工厂方法。
    // 这是因为重量、质量、条件和函数由下面的 lambda 提供。
    private EntityLootEntry(Holder<EntityType<?>> entity, int weight, int quality, List<LootItemCondition> conditions, List<LootItemFunction> functions) {
        // 将 lambda 提供的参数传递给 super。
        super(weight, quality, conditions, functions);
        // 设置我们的价值观。
        this.entity = entity;
    }

    // 静态 builder 方法，接受我们的自定义参数并将它们与提供所有条目通用值的 lambda 组合。
    public static LootPoolSingletonContainer.Builder<?> entityLoot(Holder<EntityType<?>> entity) {
        // 使用 LootPoolSingletonContainer 中定义的 static simpleBuilder() 方法。
        return simpleBuilder((weight, quality, conditions, functions) -> new EntityLootEntry(entity, weight, quality, conditions, functions));
    }

    // 这就是奇迹发生的地方。要添加ItemStack，我们通常对消费者调用 #accept。
    // 但是，在此情况下，我们让 #getRandomItems 为我们做这件事。
    @Override
    public void createItemStack(Consumer<ItemStack> consumer, LootContext context) {
        // 获取实体的战利品表。如果该表不存在，则返回空战利品表，因此无需执行 null 检查。
        LootTable table = context.getLevel().reloadableRegistries().getLootTable(entity.value().getDefaultLootTable());
        // 在这里使用原始版本，因为原版也这样做。：P
        // #getRandomItemsRaw 会为抽取结果调用 consumer#accept。
        table.getRandomItemsRaw(context, consumer);
    }

    // 告诉条目使用什么进行序列化。
    @Override
    public MapCodec<EntityLootEntry> codec() {
        return CODEC;
    }
}
```

随后在[注册][registries]时使用该映射 codec：

```java
public static final DeferredRegister<MapCodec<? extends LootPoolEntryContainer>> LOOT_POOL_ENTRY_TYPES =
        DeferredRegister.create(Registries.LOOT_POOL_ENTRY_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<EntityLootEntry>> ENTITY_LOOT =
        LOOT_POOL_ENTRY_TYPES.register("entity_loot", () -> EntityLootEntry.CODEC);
```

## 自定义数值提供器

要创建自定义数值提供器，请实现 `NumberProvider` 接口。作为示例，假设我们要创建一个能够反转给定数值正负号的数值提供器：

```java
// 我们接受另一个数值提供器作为我们的基础。
public record InvertedSignProvider(NumberProvider base) implements NumberProvider {
    public static final MapCodec<InvertedSignProvider> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            NumberProviders.CODEC.fieldOf("base").forGetter(InvertedSignProvider::base)
    ).apply(inst, InvertedSignProvider::new));

    // 返回 float 值。根据需要使用上下文和 record 参数。
    @Override
    public float getFloat(LootContext context) {
        return -this.base.getFloat(context);
    }

    // 返回 int 值。根据需要使用上下文和 record 参数。
    // 覆盖这是可选的，默认实现将舍入 #getFloat 的结果。
    @Override
    public int getInt(LootContext context) {
        return -this.base.getInt(context);
    }

    // 返回此提供器使用的一组战利品上下文参数。请参阅下文了解更多信息。
    // 因为我们有一个基值，所以我们只是遵循基值。
    @Override
    public Set<ContextKey<?>> getReferencedContextParams() {
        return this.base.getReferencedContextParams();
    }

    // 告诉提供器使用什么进行序列化。
    @Override
    public MapCodec<InvertedSignProvider> codec() {
        return CODEC;
    }
}
```

与自定义战利品条目一样，随后在[注册][registries]时使用该 codec：

```java
public static final DeferredRegister<MapCodec<? extends NumberProvider>> LOOT_NUMBER_PROVIDER_TYPES =
        DeferredRegister.create(Registries.LOOT_NUMBER_PROVIDER_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<? extends NumberProvider>> INVERTED_SIGN =
        LOOT_NUMBER_PROVIDER_TYPES.register("inverted_sign", () -> InvertedSignProvider.CODEC);
```

## 自定义基于等级的值

可以在 record 中实现 `LevelBasedValue` 接口，以创建自定义 `LevelBasedValue`。同样，作为示例，假设我们要对另一个 `LevelBasedValue` 的输出取反：

```java
public record InvertedSignLevelBasedValue(LevelBasedValue base) implements LevelBaseValue {
    public static final MapCodec<InvertedLevelBasedValue> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            LevelBasedValue.CODEC.fieldOf("base").forGetter(InvertedLevelBasedValue::base)
    ).apply(inst, InvertedLevelBasedValue::new));

    // 执行我们的操作。
    @Override
    public float calculate(int level) {
        return -this.base.calculate(level);
    }

    // 告诉值用于序列化的内容。
    @Override
    public MapCodec<InvertedLevelBasedValue> codec() {
        return CODEC;
    }
}
```

随后同样在[注册][registries]时使用该 codec：

```java
public static final DeferredRegister<MapCodec<? extends LevelBasedValue>> LEVEL_BASED_VALUES =
        DeferredRegister.create(Registries.ENCHANTMENT_LEVEL_BASED_VALUE_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<InvertedSignLevelBasedValue>> INVERTED_SIGN =
        LEVEL_BASED_VALUES.register("inverted_sign", () -> InvertedSignLevelBasedValue.CODEC);
```

## 自定义战利品条件

首先创建实现 `LootItemCondition` 的战利品 Item 条件类。作为示例，假设我们只想在击杀生物的玩家达到特定经验等级时让条件通过：

```java
public record HasXpLevelCondition(int level) implements LootItemCondition {
    // 添加此条件所需的上下文。在我们的例子中，此将是玩家必须拥有的 XP 等级。
    public static final MapCodec<HasXpLevelCondition> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            Codec.INT.fieldOf("level").forGetter(HasXpLevelCondition::level)
    ).apply(inst, HasXpLevelCondition::new));
    
    // 评估此处的条件。从提供的 LootContext 获取所需的战利品上下文参数。
    // 在我们的例子中，我们希望 KILLER_ENTITY 至少具有我们所需的级别。
    @Override
    public boolean test(LootContext context) {
        @Nullable
        Entity entity = context.getOptionalParameter(LootContextParams.KILLER_ENTITY);
        return entity instanceof Player player && player.experienceLevel >= level; 
    }
    
    // 告诉游戏我们期望从战利品上下文中获得哪些参数。用于验证。
    @Override
    public Set<ContextKey<?>> getReferencedContextParams() {
        return ImmutableSet.of(LootContextParams.KILLER_ENTITY);
    }

    // 告诉条件使用什么进行序列化。
    @Override
    public MapCodec<HasXpLevelCondition> codec() {
        return CODEC;
    }
}
```

可以将该映射 codec [注册][registries]到 Registry：

```java
public static final DeferredRegister<MapCodec<? extends LootItemCondition>> LOOT_CONDITION_TYPES =
        DeferredRegister.create(Registries.LOOT_CONDITION_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<HasXpLevelCondition>> MIN_XP_LEVEL =
        LOOT_CONDITION_TYPES.register("min_xp_level", () -> HasXpLevelCondition.CODEC);
```

## 自定义战利品函数

首先创建一个扩展 `LootItemFunction` 的自定义类。`LootItemFunction` 扩展了 `BiFunction<ItemStack, LootContext, ItemStack>`，因此我们的目标是使用现有 ItemStack 与战利品上下文，返回一个经过修改的新 ItemStack。不过，几乎所有战利品函数都不会直接扩展 `LootItemFunction`，而是改为扩展 `LootItemConditionalFunction`。该类内置了将战利品条件应用到函数的功能——只有战利品条件成立时才会应用函数。作为示例，我们为 Item 应用一个具有指定等级的随机附魔：

```java
// 代码改编自原版 EnchantRandomlyFunction 类。
// LootItemConditionalFunction 是一个 abstract 类，而不是接口，因此我们不能在这里使用 record。
public class RandomEnchantmentWithLevelFunction extends LootItemConditionalFunction {
    // 我们的上下文：可选的附魔列表和一个级别。
    private final Optional<HolderSet<Enchantment>> enchantments;
    private final int level;
    // 我们的编解码器。
    public static final MapCodec<RandomEnchantmentWithLevelFunction> CODEC =
            // #commonFields 添加条件字段。
            RecordCodecBuilder.mapCodec(inst -> commonFields(inst).and(inst.group(
                    RegistryCodecs.homogeneousList(Registries.ENCHANTMENT).optionalFieldOf("enchantments").forGetter(e -> e.enchantments),
                    Codec.INT.fieldOf("level").forGetter(e -> e.level)
            ).apply(inst, RandomEnchantmentWithLevelFunction::new));
    
    public RandomEnchantmentWithLevelFunction(List<LootItemCondition> conditions, Optional<HolderSet<Enchantment>> enchantments, int level) {
        super(conditions);
        this.enchantments = enchantments;
        this.level = level;
    }
    
    // 运行我们的附魔应用程序逻辑。 其大部分内容是从 EnchantRandomlyFunction#run 复制而来的。
    @Override
    public ItemStack run(ItemStack stack, LootContext context) {
        RandomSource random = context.getRandom();
        List<Holder<Enchantment>> stream = this.enchantments
                .map(HolderSet::stream)
                .orElseGet(() -> context.getLevel().registryAccess().lookupOrThrow(Registries.ENCHANTMENT).listElements().map(Function.identity()))
                .filter(e -> e.value().canEnchant(stack))
                .toList();
        Optional<Holder<Enchantment>> optional = Util.getRandomSafe(list, random);
        if (optional.isEmpty()) {
            LOGGER.warn("Couldn't find a compatible enchantment for {}", stack);
        } else {
            Holder<Enchantment> enchantment = optional.get();
            if (stack.is(Items.BOOK)) {
                stack = new ItemStack(Items.ENCHANTED_BOOK);
            }
            stack.enchant(enchantment, Mth.nextInt(random, enchantment.value().getMinLevel(), enchantment.value().getMaxLevel()));
        }
        return stack;
    }

    // 告诉函数使用什么进行序列化。
    @Override
    public MapCodec<RandomEnchantmentWithLevelFunction> codec() {
        return CODEC;
    }
}
```

随后可以将该映射 codec [注册][registries]到 Registry：

```java
public static final DeferredRegister<MapCodec<? extends LootItemFunction>> LOOT_FUNCTION_TYPES =
        DeferredRegister.create(Registries.LOOT_FUNCTION_TYPE, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<RandomEnchantmentWithLevelFunction>> RANDOM_ENCHANTMENT_WITH_LEVEL =
        LOOT_FUNCTION_TYPES.register("random_enchantment_with_level", () -> RandomEnchantmentWithLevelFunction.CODEC);
```

[codec]: ../../../datastorage/codecs.md
[entity]: ../../../entities/index.md
[registries]: ../../../concepts/registries.md#methods-for-registering
